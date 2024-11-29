import express from 'express'
import dotenv from 'dotenv'
import { execa } from 'execa'
import { customAlphabet } from 'nanoid'
import cookieParser from 'cookie-parser'
import cron from 'node-cron'
import net from 'net'

dotenv.config()
console.log('Environment variables loaded')

const app = express()
const router = express.Router()
app.use(express.json())
app.use(cookieParser())
console.log('Express app configured with JSON and cookie parser middleware')

const SANDBOX_LIFETIME_MS = 60 * 60 * 1000
const sandboxes = new Map()
const creationLocks = new Map()
const generateId = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10)
console.log(
  `Sandbox lifetime set to ${SANDBOX_LIFETIME_MS / 1000 / 60} minutes`
)

async function cleanupExpiredSandboxes() {
  console.log('Starting cleanup of expired sandboxes')
  const now = Date.now()
  let cleanedCount = 0

  for (const [sandboxId, createdAt] of sandboxes.entries()) {
    if (now - createdAt > SANDBOX_LIFETIME_MS) {
      console.log(`Sandbox ${sandboxId} has expired, cleaning up...`)
      try {
        await deleteCluster(sandboxId)
        sandboxes.delete(sandboxId)
        cleanedCount++
        console.log(`Successfully cleaned up sandbox ${sandboxId}`)
      } catch (error) {
        console.error(`Failed to cleanup sandbox ${sandboxId}:`, error)
      }
    }
  }
  console.log(`Cleanup completed. Removed ${cleanedCount} expired sandboxes`)
}

cron.schedule('*/5 * * * *', cleanupExpiredSandboxes, {
  scheduled: true,
  timezone: 'UTC',
})
console.log('Scheduled cleanup cron job every 5 minutes')

async function findAvailablePort(startPort = 6443) {
  let port = startPort
  while (port < 65535) {
    try {
      const server = net.createServer()
      await new Promise((resolve, reject) => {
        server.once('error', (err) => {
          server.close()
          reject(err)
        })
        server.once('listening', () => {
          server.close()
          resolve(true)
        })
        server.listen(port)
      })
      return port
    } catch (err) {
      port++
    }
  }
  throw new Error('No available ports found')
}

async function createCluster(sandboxId) {
  console.log(`Starting creation of cluster ${sandboxId}`)
  try {
    const port = await findAvailablePort()
    console.log(`Using port ${port} for cluster ${sandboxId}`)
    console.log('Executing k3d cluster create command...')
    await execa('k3d', [
      'cluster',
      'create',
      sandboxId,
      '--api-port',
      port.toString(),
      '--k3s-arg',
      '--disable=traefik@server:0',
      '--wait',
    ])
    console.log('K3d cluster creation command completed')

    console.log('Waiting 10 seconds for cluster initialization...')
    await new Promise((resolve) => setTimeout(resolve, 10000))

    console.log('Waiting for nodes to be ready...')
    await execa('kubectl', [
      '--context',
      `k3d-${sandboxId}`,
      'wait',
      '--for=condition=Ready',
      'nodes',
      '--all',
      '--timeout=30s',
    ])
    console.log('All nodes are ready')

    sandboxes.set(sandboxId, Date.now())
    console.log(`Cluster ${sandboxId} created successfully`)
    return true
  } catch (error) {
    console.error('K3d error:', error)
    throw new Error(`Failed to create cluster: ${error.message}`)
  }
}

async function deleteCluster(sandboxId) {
  console.log(`Starting deletion of cluster ${sandboxId}`)
  try {
    await execa('k3d', ['cluster', 'delete', sandboxId])
    sandboxes.delete(sandboxId)
    console.log(`Successfully deleted cluster ${sandboxId}`)
  } catch (error) {
    console.error('Delete error:', error)
    throw new Error(`Failed to delete cluster: ${error.message}`)
  }
}

function preventConcurrentRequests(req, res, next) {
  const clientIp = req.ip
  console.log(`Checking concurrent requests for IP: ${clientIp}`)

  if (creationLocks.get(clientIp)) {
    console.log(`Concurrent request detected for IP: ${clientIp}`)
    return res.status(429).json({
      error: 'A sandbox is already being created for this IP. Please wait.',
    })
  }

  creationLocks.set(clientIp, true)
  console.log(`Lock set for IP: ${clientIp}`)
  res.on('finish', () => {
    creationLocks.delete(clientIp)
    console.log(`Lock released for IP: ${clientIp}`)
  })

  next()
}

async function validateSandbox(req, res, next) {
  const sandboxId = req.cookies.sandboxId
  console.log(`Validating sandbox: ${sandboxId}`)

  if (!sandboxId) {
    console.log('No sandbox ID found in cookies')
    return res
      .status(401)
      .json({ error: 'Sandbox not found. Create a new sandbox first.' })
  }

  try {
    console.log('Checking k3d cluster list...')
    const result = await execa('k3d', ['cluster', 'list'])
    const clusters = result.stdout
      .split('\n')
      .filter((line) => line.includes(sandboxId))

    if (clusters.length === 0) {
      console.log(`Sandbox ${sandboxId} not found in cluster list`)
      throw new Error('Sandbox not found')
    }

    console.log(`Sandbox ${sandboxId} validated successfully`)
    next()
  } catch (error) {
    console.log(`Validation failed for sandbox ${sandboxId}:`, error.message)
    res.clearCookie('sandboxId')
    sandboxes.delete(sandboxId)
    return res.status(404).json({ error: 'Sandbox not found or expired.' })
  }
}

async function executeKubectlCommand(sandboxId, command) {
  try {
    console.log(
      `Executing command for cluster k3d-${sandboxId}: kubectl ${command}`
    )
    const args = command
      .trim()
      .split(/\s+/)
      .filter((arg) => arg !== '')
    console.log('Parsed command arguments:', args)

    const result = await execa('kubectl', [
      '--context',
      `k3d-${sandboxId}`,
      ...args,
    ])
    console.log('Command output:', result.stdout)
    return result.stdout
  } catch (error) {
    console.error('Kubectl error:', error)
    throw new Error(`Error executing command: ${error.message}`)
  }
}

router.post('/sandbox', preventConcurrentRequests, async (req, res) => {
  console.log('Received request to create/get sandbox')
  try {
    const existingSandboxId = req.cookies.sandboxId
    if (existingSandboxId) {
      console.log(`Found existing sandbox ID: ${existingSandboxId}`)
      try {
        console.log('Checking if existing sandbox is still valid')
        const result = await execa('k3d', ['cluster', 'list'])
        const clusters = result.stdout
          .split('\n')
          .filter((line) => line.includes(existingSandboxId))

        if (clusters.length > 0) {
          console.log(`Existing sandbox ${existingSandboxId} is valid`)
          return res.json({
            message: 'Using existing sandbox',
            sandboxId: existingSandboxId,
            expiresIn: `${SANDBOX_LIFETIME_MS / 1000 / 60} minutes`,
          })
        }
      } catch (error) {
        console.log(
          `Existing sandbox ${existingSandboxId} is invalid, cleaning up`
        )
        res.clearCookie('sandboxId')
        sandboxes.delete(existingSandboxId)
      }
    }

    const sandboxId = 'sb-' + generateId()
    console.log(`Creating new sandbox with ID: ${sandboxId}`)
    await createCluster(sandboxId)

    console.log('Setting sandbox cookie')
    res.cookie('sandboxId', sandboxId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SANDBOX_LIFETIME_MS,
    })

    res.json({
      message: 'Sandbox created successfully',
      sandboxId,
      expiresIn: `${SANDBOX_LIFETIME_MS / 1000 / 60} minutes`,
    })
  } catch (error) {
    console.error('Error creating sandbox:', error)
    res.status(500).json({ error: error.message })
  }
})

router.post('/sandbox/exec', validateSandbox, async (req, res) => {
  console.log('Received command execution request')
  try {
    const { command } = req.body
    const sandboxId = req.cookies.sandboxId

    if (!command) {
      console.log('No command provided in request')
      return res.status(400).json({ error: 'Command not provided' })
    }

    console.log(`Executing command "${command}" in sandbox ${sandboxId}`)
    const output = await executeKubectlCommand(sandboxId, command)

    console.log('Command executed successfully')
    res.json({
      message: 'Command executed successfully',
      command,
      output,
    })
  } catch (error) {
    console.error('Error executing command:', error)
    res.status(500).json({ error: error.message })
  }
})

router.delete('/sandbox', validateSandbox, async (req, res) => {
  console.log('Received sandbox deletion request')
  try {
    const sandboxId = req.cookies.sandboxId
    console.log(`Deleting sandbox ${sandboxId}`)
    await deleteCluster(sandboxId)
    res.clearCookie('sandboxId')
    console.log(`Sandbox ${sandboxId} deleted successfully`)
    res.json({
      message: 'Sandbox deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting sandbox:', error)
    res.status(500).json({ error: error.message })
  }
})

app.use('/api', router)

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
