import express from 'express'
import dotenv from 'dotenv'
import { execa } from 'execa'
import { customAlphabet } from 'nanoid'
import cookieParser from 'cookie-parser'
import cron from 'node-cron'
import net from 'net'
import fs from 'fs/promises'

dotenv.config()
console.log('Environment variables loaded')

const app = express()
const router = express.Router()
app.use(express.json())
app.use(cookieParser())
console.log('Express app configured with JSON and cookie parser middleware')

const SANDBOX_LIFETIME_MS = 60 * 60 * 1000
const MAX_CONCURRENT_SANDBOXES = 0
const sandboxes = new Map()
const creationLocks = new Map()
const ipToSandbox = new Map()
const sandboxQueue = []
const generateId = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10)
console.log(
  `Sandbox lifetime set to ${SANDBOX_LIFETIME_MS / 1000 / 60} minutes`
)

async function processQueue() {
  if (sandboxes.size >= MAX_CONCURRENT_SANDBOXES || sandboxQueue.length === 0) {
    return
  }

  const { ip, resolve, reject } = sandboxQueue.shift()
  const sandboxId = 'sb-' + generateId()

  try {
    console.log(`Processing queue: Creating sandbox ${sandboxId} for IP ${ip}`)
    await createCluster(sandboxId)
    ipToSandbox.set(ip, sandboxId)
    sandboxes.set(sandboxId, Date.now())
    resolve({
      sandboxId,
      message: 'Sandbox created successfully',
      expiresIn: `${SANDBOX_LIFETIME_MS / 1000 / 60} minutes`,
    })
  } catch (error) {
    console.error(`Error creating sandbox from queue for IP ${ip}:`, error)
    reject(error)
  } finally {
    processQueue()
  }
}

async function cleanupExpiredSandboxes() {
  console.log('Starting cleanup of expired sandboxes')
  const now = Date.now()
  let cleanedCount = 0

  try {
    const ipSandboxes = new Map()
    for (const [ip, sandboxId] of ipToSandbox.entries()) {
      if (!ipSandboxes.has(ip)) {
        ipSandboxes.set(ip, [])
      }
      ipSandboxes.get(ip).push(sandboxId)
    }

    for (const [ip, sandboxIds] of ipSandboxes.entries()) {
      if (sandboxIds.length > 1) {
        console.log(`Found multiple sandboxes for IP ${ip}, cleaning up...`)
        const sortedSandboxes = sandboxIds
          .filter((id) => sandboxes.has(id))
          .sort((a, b) => sandboxes.get(b) - sandboxes.get(a))

        for (let i = 1; i < sortedSandboxes.length; i++) {
          const sandboxId = sortedSandboxes[i]
          console.log(`Removing duplicate sandbox ${sandboxId} for IP ${ip}`)
          try {
            await deleteCluster(sandboxId)
            sandboxes.delete(sandboxId)
            ipToSandbox.delete(ip)
            cleanedCount++
          } catch (error) {
            console.error(
              `Failed to remove duplicate sandbox ${sandboxId}:`,
              error
            )
          }
        }
      }
    }

    const result = await execa('k3d', ['cluster', 'list', '--no-headers'])
    const clusters = result.stdout
      .split('\n')
      .filter((line) => line.trim() !== '')

    for (const clusterLine of clusters) {
      const clusterName = clusterLine.split(/\s+/)[0]

      if (clusterName.startsWith('sb-')) {
        const createdAt = sandboxes.get(clusterName)

        if (!createdAt || now - createdAt > SANDBOX_LIFETIME_MS) {
          console.log(
            `Cluster ${clusterName} is expired or orphaned, removing...`
          )
          try {
            await deleteCluster(clusterName)
            sandboxes.delete(clusterName)
            for (const [ip, sandbox] of ipToSandbox.entries()) {
              if (sandbox === clusterName) {
                ipToSandbox.delete(ip)
              }
            }
            cleanedCount++
            console.log(`Cluster ${clusterName} successfully removed`)
          } catch (error) {
            console.error(`Failed to remove cluster ${clusterName}:`, error)
          }
        }
      }
    }
  } catch (error) {
    console.error('Error during cleanup:', error)
  }

  console.log(`Cleanup completed. Removed ${cleanedCount} clusters`)

  processQueue()
}

cleanupExpiredSandboxes()

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

    console.log('Exporting kubeconfig...')
    const kubeconfigResult = await execa('k3d', [
      'kubeconfig',
      'get',
      sandboxId,
    ])
    await fs.writeFile(`/tmp/kubeconfig-${sandboxId}`, kubeconfigResult.stdout)
    console.log('Kubeconfig exported successfully')

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

async function executeCommand(sandboxId, command, type = 'kubectl') {
  try {
    console.log(
      `Executing command for cluster k3d-${sandboxId}: ${type} ${command}`
    )

    const args = command
      .match(/(?:[^\s"]+|"[^"]*")+/g)
      .map((arg) =>
        arg.startsWith('"') && arg.endsWith('"') ? arg.slice(1, -1) : arg
      )
    console.log('Parsed command arguments:', args)

    const result = await execa(type, [
      '--kubeconfig',
      `/tmp/kubeconfig-${sandboxId}`,
      ...args,
    ])

    console.log('Command output:', result.stdout)
    return result.stdout
  } catch (error) {
    console.error(`${type} error:`, error)
    throw {
      message: error.message,
      stderr: error.stderr,
      command: error.command,
      exitCode: error.exitCode,
    }
  }
}

router.post('/sandbox', preventConcurrentRequests, async (req, res) => {
  console.log('Received request to create/get sandbox')
  const clientIp = req.ip
  try {
    const existingSandboxId = ipToSandbox.get(clientIp)
    console.log(`Checking sandbox for IP ${clientIp}: ${existingSandboxId}`)

    if (existingSandboxId) {
      try {
        console.log('Checking if existing sandbox is still valid')
        const result = await execa('k3d', ['cluster', 'list'])
        const clusters = result.stdout
          .split('\n')
          .filter((line) => line.includes(existingSandboxId))

        if (clusters.length > 0 && sandboxes.has(existingSandboxId)) {
          const createdAt = sandboxes.get(existingSandboxId)
          const now = Date.now()

          if (now - createdAt <= SANDBOX_LIFETIME_MS) {
            console.log(`Existing sandbox ${existingSandboxId} is valid`)
            res.cookie('sandboxId', existingSandboxId, {
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'strict',
              maxAge: SANDBOX_LIFETIME_MS - (now - createdAt),
            })
            return res.json({
              message: 'Using existing sandbox',
              sandboxId: existingSandboxId,
              expiresIn:
                Math.floor(
                  (SANDBOX_LIFETIME_MS - (now - createdAt)) / 1000 / 60
                ) + ' minutes',
            })
          }
        }
      } catch (error) {
        console.log(
          `Existing sandbox ${existingSandboxId} is invalid, cleaning up`
        )
      }
      ipToSandbox.delete(clientIp)
      sandboxes.delete(existingSandboxId)
      res.clearCookie('sandboxId')
    }

    if (sandboxes.size >= MAX_CONCURRENT_SANDBOXES) {
      console.log(
        'Maximum number of concurrent sandboxes reached, adding to queue'
      )
      const queuePosition = sandboxQueue.length + 1

      try {
        const result = await new Promise((resolve, reject) => {
          console.log(
            `Adding IP ${clientIp} to queue at position ${queuePosition}`
          )
          sandboxQueue.push({ ip: clientIp, resolve, reject })
        })

        const { sandboxId, message, expiresIn } = result
        console.log('Setting sandbox cookie from queue')
        res.cookie('sandboxId', sandboxId, {
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: SANDBOX_LIFETIME_MS,
        })

        return res.json({ message, sandboxId, expiresIn, queuePosition })
      } catch (error) {
        console.error('Error while in queue:', error)
        return res.status(500).json({ error: error.message })
      }
    }

    const sandboxId = 'sb-' + generateId()
    console.log(`Creating new sandbox with ID: ${sandboxId}`)
    await createCluster(sandboxId)

    ipToSandbox.set(clientIp, sandboxId)
    sandboxes.set(sandboxId, Date.now())

    console.log('Setting sandbox cookie')
    res.cookie('sandboxId', sandboxId, {
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
  try {
    const { command, type = 'kubectl' } = req.body
    const sandboxId = req.cookies.sandboxId

    if (!sandboxId) {
      return res.status(400).json({ error: 'Sandbox ID not found' })
    }

    const output = await executeCommand(sandboxId, command)
    res.json({ output })
  } catch (error) {
    console.error('Error executing command:', error)
    res.status(500).json({
      error: 'Failed to execute command',
      details: {
        message: error.message,
        stderr: error.stderr,
        command: error.command,
        exitCode: error.exitCode,
      },
    })
  }
})

router.delete('/sandbox', validateSandbox, async (req, res) => {
  console.log('Received sandbox deletion request')
  try {
    const sandboxId = req.cookies.sandboxId
    const clientIp = req.ip
    console.log(`Deleting sandbox ${sandboxId}`)
    await deleteCluster(sandboxId)
    sandboxes.delete(sandboxId)
    ipToSandbox.delete(clientIp)
    res.clearCookie('sandboxId')
    console.log(`Sandbox ${sandboxId} deleted successfully`)

    processQueue()

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
