// IndexedDB utility for storing nodes and edges

const DB_NAME = 'CollocationGraphDB'
const DB_VERSION = 1
const NODES_STORE = 'nodes'
const EDGES_STORE = 'edges'

// Initialize the database
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create nodes store if it doesn't exist
      if (!db.objectStoreNames.contains(NODES_STORE)) {
        db.createObjectStore(NODES_STORE, { keyPath: 'id' })
      }

      // Create edges store if it doesn't exist
      if (!db.objectStoreNames.contains(EDGES_STORE)) {
        db.createObjectStore(EDGES_STORE, { keyPath: 'id' })
      }
    }
  })
}

// Save a node to the database
export const saveNode = async (node: any): Promise<void> => {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([NODES_STORE], 'readwrite')
    const store = transaction.objectStore(NODES_STORE)
    const request = store.put(node)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// Save an edge to the database
export const saveEdge = async (edge: any): Promise<void> => {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([EDGES_STORE], 'readwrite')
    const store = transaction.objectStore(EDGES_STORE)
    const request = store.put(edge)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// Get all nodes from the database
export const getAllNodes = async (): Promise<any[]> => {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([NODES_STORE], 'readonly')
    const store = transaction.objectStore(NODES_STORE)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Get all edges from the database
export const getAllEdges = async (): Promise<any[]> => {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([EDGES_STORE], 'readonly')
    const store = transaction.objectStore(EDGES_STORE)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Clear all data from the database
export const clearAllData = async (): Promise<void> => {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([NODES_STORE, EDGES_STORE], 'readwrite')

    const nodesStore = transaction.objectStore(NODES_STORE)
    const edgesStore = transaction.objectStore(EDGES_STORE)

    nodesStore.clear()
    edgesStore.clear()

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

// Delete a specific node
export const deleteNode = async (id: number): Promise<void> => {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([NODES_STORE], 'readwrite')
    const store = transaction.objectStore(NODES_STORE)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// Delete a specific edge
export const deleteEdge = async (id: number): Promise<void> => {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([EDGES_STORE], 'readwrite')
    const store = transaction.objectStore(EDGES_STORE)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
