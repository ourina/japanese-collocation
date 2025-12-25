import { Network } from 'vis-network'
import { DataSet } from 'vis-data'
import { useRef, useEffect, useState } from 'react'
import { saveNode, saveEdge, getAllNodes, getAllEdges, clearAllData } from './db'

interface NodeType {
  id: number
  label: string
}

interface EdgeType {
  id: number
  from: number
  to: number
  label?: string
  length?: number
  font?: { size: number; color: string; align: string }
  arrows?: {
    to: {
      enabled: boolean
      scaleFactor: number
      type: string
    }
  }
}

// ノードタイプの定義
const NODE_TYPES = {
  large_red: {
    name: '大（赤）',
    size: 30,
    color: {
      border: '#c62828',
      background: '#ffcdd2',
      highlight: { border: '#b71c1c', background: '#ef5350' },
    },
  },
  large_blue: {
    name: '大（青）',
    size: 30,
    color: {
      border: '#1565c0',
      background: '#bbdefb',
      highlight: { border: '#0d47a1', background: '#42a5f5' },
    },
  },
  large_green: {
    name: '大（緑）',
    size: 30,
    color: {
      border: '#2e7d32',
      background: '#c8e6c9',
      highlight: { border: '#1b5e20', background: '#66bb6a' },
    },
  },
  medium_red: {
    name: '中（赤）',
    size: 24,
    color: {
      border: '#d32f2f',
      background: '#ffcdd2',
      highlight: { border: '#c62828', background: '#e57373' },
    },
  },
  medium_blue: {
    name: '中（青）',
    size: 24,
    color: {
      border: '#1976d2',
      background: '#bbdefb',
      highlight: { border: '#1565c0', background: '#64b5f6' },
    },
  },
  medium_green: {
    name: '中（緑）',
    size: 24,
    color: {
      border: '#388e3c',
      background: '#c8e6c9',
      highlight: { border: '#2e7d32', background: '#81c784' },
    },
  },
  small_red: {
    name: '小（赤）',
    size: 18,
    color: {
      border: '#e53935',
      background: '#ffebee',
      highlight: { border: '#d32f2f', background: '#ef5350' },
    },
  },
  small_blue: {
    name: '小（青）',
    size: 18,
    color: {
      border: '#1e88e5',
      background: '#e3f2fd',
      highlight: { border: '#1976d2', background: '#42a5f5' },
    },
  },
  small_green: {
    name: '小（緑）',
    size: 18,
    color: {
      border: '#43a047',
      background: '#e8f5e9',
      highlight: { border: '#388e3c', background: '#66bb6a' },
    },
  },
}

const options = {
  autoResize: true,
  height: '100%',
  width: '100%',
  nodes: {
    shape: 'circle',
    font: { size: 20, color: '#000000' },
    margin: { top: 10, right: 10, bottom: 10, left: 10 },
    borderWidth: 2,
    color: {
      border: '#b5d7ffff',
      background: '#ffffffff',
      highlight: {
        border: '#45a5ffff',
        background: '#aed5ffff',
      },
    },
  },
}

function NetworkGraph() {
  // ネットワークグラフを作成
  /** DOMを参照できるように useRef を使用して Element を取得する */
  const ref = useRef<HTMLDivElement>(null)
  let network: Network | null = null

  // ノードとエッジのデータセット
  const nodesDataSet = useRef(new DataSet<NodeType>([]))
  const edgesDataSet = useRef(new DataSet<EdgeType>([]))
  const [isLoading, setIsLoading] = useState(true)

  // 新しいノード追加用のフォーム状態
  const [newNodeLabel, setNewNodeLabel] = useState('')
  const [selectedNodeType, setSelectedNodeType] = useState<keyof typeof NODE_TYPES>('medium_blue')

  // 新しいエッジ追加用のフォーム状態
  const [edgeFrom, setEdgeFrom] = useState('')
  const [edgeTo, setEdgeTo] = useState('')
  const [edgeLabel, setEdgeLabel] = useState('')

  const [nextNodeId, setNextNodeId] = useState(1)
  const [nextEdgeId, setNextEdgeId] = useState(1)
  const [updateTrigger, setUpdateTrigger] = useState(0)

  // IndexedDBからデータを読み込む
  useEffect(() => {
    const loadData = async () => {
      try {
        const nodes = await getAllNodes()
        const edges = await getAllEdges()

        if (nodes.length > 0) {
          nodesDataSet.current.clear()
          nodesDataSet.current.add(nodes)
          const maxNodeId = Math.max(...nodes.map((n: any) => n.id))
          setNextNodeId(maxNodeId + 1)
        }

        if (edges.length > 0) {
          edgesDataSet.current.clear()
          edgesDataSet.current.add(edges)
          const maxEdgeId = Math.max(...edges.map((e: any) => e.id))
          setNextEdgeId(maxEdgeId + 1)
        }

        // Networkが存在しない場合の処理
        if (!network && ref.current) {
          // Network Instanceを作成して、DataをSetする
          network = new Network(
            ref.current,
            {
              nodes: nodesDataSet.current,
              edges: edgesDataSet.current,
            },
            options
          )
        }
      } catch (error) {
        console.error('データの読み込みに失敗しました:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()

    // Clickイベントハンドラを追加する
    network?.on('click', (params: { nodes: number[] }) => {})
  }, [updateTrigger])

  // 新しいノードを追加する
  const addNode = async () => {
    if (newNodeLabel.trim() === '') {
      alert('ノードラベルを入力してください')
      return
    }

    const nodeTypeConfig = NODE_TYPES[selectedNodeType]
    const newNode = {
      id: nextNodeId,
      label: newNodeLabel,
      shape: 'circle',
      font: { size: nodeTypeConfig.size, color: '#000000' },
      margin: { top: 10, right: 10, bottom: 10, left: 10 },
      borderWidth: 2,
      color: nodeTypeConfig.color,
    }

    nodesDataSet.current.add(newNode)
    setNextNodeId(nextNodeId + 1)
    setNewNodeLabel('')
    setUpdateTrigger((prev) => prev + 1)

    // IndexedDBに保存
    try {
      await saveNode(newNode)
    } catch (error) {
      console.error('ノードの保存に失敗しました:', error)
      alert('データベースへのノード保存に失敗しました')
    }
  }

  // ドロップダウン用に全ノードを配列として取得
  const getNodesList = () => {
    return nodesDataSet.current.get() as Array<{ id: number; label: string }>
  }

  // 新しいエッジを追加する
  const addEdge = async () => {
    if (!edgeFrom || !edgeTo) {
      alert('開始ノードと終了ノードを選択してください')
      return
    }

    const fromId = parseInt(edgeFrom)
    const toId = parseInt(edgeTo)

    const newEdge = {
      id: nextEdgeId,
      from: fromId,
      to: toId,
      label: edgeLabel,
      length: 150,
      font: { size: 16, color: '#000000ff', align: 'top' },
      arrows: {
        to: {
          enabled: true,
          scaleFactor: 1,
          type: 'arrow',
        },
      },
    }

    edgesDataSet.current.add(newEdge)
    setNextEdgeId(nextEdgeId + 1)
    setEdgeFrom('')
    setEdgeTo('')
    setEdgeLabel('')

    // IndexedDBに保存
    try {
      await saveEdge(newEdge)
    } catch (error) {
      console.error('エッジの保存に失敗しました:', error)
      alert('データベースへのエッジ保存に失敗しました')
    }
  }

  // 全データをクリア
  const handleClearData = async () => {
    if (!confirm('すべてのデータを削除しますか？この操作は元に戻せません！')) {
      return
    }

    try {
      await clearAllData()
      nodesDataSet.current.clear()
      edgesDataSet.current.clear()
      setNextNodeId(1)
      setNextEdgeId(1)
      setUpdateTrigger((prev) => prev + 1)
      alert('データが削除されました')
    } catch (error) {
      console.error('データの削除に失敗しました:', error)
      alert('データの削除に失敗しました')
    }
  }

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: '18px',
        }}
      >
        データ読み込み中...
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
      }}
    >
      {/* Control Panel */}
      <div
        style={{
          padding: '20px',
          backgroundColor: '#f5f5f5',
          borderBottom: '2px solid #ddd',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px',
          }}
        >
          <h2 style={{ margin: 0 }}>日本語コロケーションネットワーク図</h2>
          <button
            onClick={handleClearData}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            全データを削除
          </button>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <h3 style={{ margin: '0 0 10px 0' }}>ノードを追加</h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={selectedNodeType}
              onChange={(e) => setSelectedNodeType(e.target.value as keyof typeof NODE_TYPES)}
              style={{
                padding: '8px',
                fontSize: '14px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                minWidth: '120px',
              }}
            >
              {Object.entries(NODE_TYPES).map(([key, value]) => (
                <option
                  key={key}
                  value={key}
                >
                  {value.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="ノードラベル"
              value={newNodeLabel}
              onChange={(e) => setNewNodeLabel(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addNode()}
              style={{
                padding: '8px',
                fontSize: '14px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                flex: '1',
                minWidth: '150px',
              }}
            />
            <button
              onClick={addNode}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              ノードを追加
            </button>
            <span style={{ fontSize: '12px', color: '#666' }}>次のノードID: {nextNodeId}</span>
          </div>
        </div>

        <div>
          <h3 style={{ margin: '0 0 10px 0' }}>エッジを追加</h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select
              value={edgeFrom}
              onChange={(e) => setEdgeFrom(e.target.value)}
              style={{
                padding: '8px',
                fontSize: '14px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                minWidth: '150px',
              }}
            >
              <option value="">開始ノードを選択</option>
              {getNodesList().map((node) => (
                <option
                  key={node.id}
                  value={node.id}
                >
                  ID:{node.id} - {node.label}
                </option>
              ))}
            </select>
            <span>→</span>
            <select
              value={edgeTo}
              onChange={(e) => setEdgeTo(e.target.value)}
              style={{
                padding: '8px',
                fontSize: '14px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                minWidth: '150px',
              }}
            >
              <option value="">終了ノードを選択</option>
              {getNodesList().map((node) => (
                <option
                  key={node.id}
                  value={node.id}
                >
                  ID:{node.id} - {node.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="エッジラベル（任意）"
              value={edgeLabel}
              onChange={(e) => setEdgeLabel(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addEdge()}
              style={{
                padding: '8px',
                fontSize: '14px',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
            <button
              onClick={addEdge}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              エッジを追加
            </button>
          </div>
        </div>
      </div>

      {/* Network Graph */}
      <div
        style={{ flex: 1, width: '100%', overflow: 'hidden' }}
        ref={ref}
      ></div>
    </div>
  )
}
export default NetworkGraph
