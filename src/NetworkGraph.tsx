import { Network } from 'vis-network'
import { DataSet } from 'vis-data'
import { useRef, useEffect, useState } from 'react'
import { message, Modal, Table, Input, Button, Select, Card, Space, Typography, Spin } from 'antd'
import {
  DeleteOutlined,
  PlusOutlined,
  ClearOutlined,
  SettingOutlined,
  EditOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  saveNode,
  saveEdge,
  getAllNodes,
  getAllEdges,
  clearAllData,
  deleteNode,
  deleteEdge,
} from './db'

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

// ノード設定の定義

// サイズオプション
const SIZE_OPTIONS = {
  large: { name: '大', size: 30, font: 20, border: 2 },
  medium: { name: '中', size: 24, font: 16, border: 1 },
  small: { name: '小', size: 18, font: 12, border: 1 },
}

// カラーオプション
const COLOR_PACITIES = {
  highlightBorder: '.8',
  highlightBackground: '.3',
  border: '.3',
  background: '.3',
}
const COLORS = {
  red: (opacity: string) => `rgba(233, 30, 30, ${opacity})`,
  blue: (opacity: string) => `rgba(64, 150, 255, ${opacity})`,
  green: (opacity: string) => `rgba(76, 175, 80, ${opacity})`,
  purple: (opacity: string) => `rgba(156, 39, 176, ${opacity})`,
  orange: (opacity: string) => `rgba(255, 152, 0, ${opacity})`,
}
const COLOR_OPTIONS = {
  red: {
    name: '赤',
    border: COLORS.red(COLOR_PACITIES.border),
    background: COLORS.red(COLOR_PACITIES.background),
    highlight: {
      border: COLORS.red(COLOR_PACITIES.highlightBorder),
      background: COLORS.red(COLOR_PACITIES.highlightBackground),
    },
  },
  blue: {
    name: '青',
    border: COLORS.blue(COLOR_PACITIES.border),
    background: COLORS.blue(COLOR_PACITIES.background),
    highlight: {
      border: COLORS.blue(COLOR_PACITIES.highlightBorder),
      background: COLORS.blue(COLOR_PACITIES.highlightBackground),
    },
  },
  green: {
    name: '緑',
    border: COLORS.green(COLOR_PACITIES.border),
    background: COLORS.green(COLOR_PACITIES.background),
    highlight: {
      border: COLORS.green(COLOR_PACITIES.highlightBorder),
      background: COLORS.green(COLOR_PACITIES.highlightBackground),
    },
  },
  purple: {
    name: '紫',
    border: COLORS.purple(COLOR_PACITIES.border),
    background: COLORS.purple(COLOR_PACITIES.background),
    highlight: {
      border: COLORS.purple(COLOR_PACITIES.highlightBorder),
      background: COLORS.purple(COLOR_PACITIES.highlightBackground),
    },
  },
  orange: {
    name: '橙',
    border: COLORS.orange(COLOR_PACITIES.border),
    background: COLORS.orange(COLOR_PACITIES.background),
    highlight: {
      border: COLORS.orange(COLOR_PACITIES.highlightBorder),
      background: COLORS.orange(COLOR_PACITIES.highlightBackground),
    },
  },
}

// 形状オプション
const SHAPE_OPTIONS = {
  ellipse: { name: '楕円', shape: 'ellipse' },
  circle: { name: '円', shape: 'circle' },
  database: { name: 'データベース', shape: 'database' },
  box: { name: '四角', shape: 'box' },
  text: { name: 'テキスト', shape: 'text' },
}

// ノード設定を生成する関数
const getNodeConfig = (
  sizeKey: keyof typeof SIZE_OPTIONS,
  colorKey: keyof typeof COLOR_OPTIONS,
  shapeKey: keyof typeof SHAPE_OPTIONS
) => {
  const size = SIZE_OPTIONS[sizeKey]
  const color = COLOR_OPTIONS[colorKey]
  const shape = SHAPE_OPTIONS[shapeKey]

  return {
    size: size.size,
    font: { size: size.font },
    color: {
      border: color.border,
      background: color.background,
      highlight: color.highlight,
    },
    shape: shape.shape,
  }
}

const getOptions = (handleDeleteNode: any, handleEditNode: any, handleDeleteEdge: any) => ({
  autoResize: true,
  height: '100%',
  width: '100%',
  manipulation: {
    enabled: true,
    initiallyActive: false,
    addNode: false,
    addEdge: false,
    editNode: (nodeData: any, callback: any) => {
      handleEditNode(nodeData, callback)
    },
    deleteNode: (nodeData: any, callback: any) => {
      handleDeleteNode(nodeData, callback)
    },
    deleteEdge: (edgeData: any, callback: any) => {
      handleDeleteEdge(edgeData, callback)
    },
  },
  nodes: {
    shape: 'circle',
    font: { size: 20, color: '#000000' },
    margin: { top: 10, right: 10, bottom: 10, left: 10 },
    borderWidth: 1,
    color: {
      border: '#b5d7ffff',
      background: '#ffffffff',
      highlight: {
        border: '#45a5ffff',
        background: '#aed5ffff',
      },
    },
  },
})

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
  const [selectedSize, setSelectedSize] = useState<keyof typeof SIZE_OPTIONS>('medium')
  const [selectedColor, setSelectedColor] = useState<keyof typeof COLOR_OPTIONS>('blue')
  const [selectedShape, setSelectedShape] = useState<keyof typeof SHAPE_OPTIONS>('circle')

  // 新しいエッジ追加用のフォーム状態
  const [edgeFrom, setEdgeFrom] = useState('')
  const [edgeTo, setEdgeTo] = useState('')
  const [edgeLabel, setEdgeLabel] = useState('')

  const [nextNodeId, setNextNodeId] = useState(1)
  const [nextEdgeId, setNextEdgeId] = useState(1)
  const [updateTrigger, setUpdateTrigger] = useState(0)
  const [selectedNodes, setSelectedNodes] = useState<number[]>([])
  const networkRef = useRef<Network | null>(null)
  const [isEdgeModalVisible, setIsEdgeModalVisible] = useState(false)
  const [edgeSearchText, setEdgeSearchText] = useState('')
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<number[]>([])
  const [isNodeModalVisible, setIsNodeModalVisible] = useState(false)
  const [nodeSearchText, setNodeSearchText] = useState('')
  const [selectedNodeIdsInModal, setSelectedNodeIdsInModal] = useState<number[]>([])
  const [isEditNodeModalVisible, setIsEditNodeModalVisible] = useState(false)
  const [editingNode, setEditingNode] = useState<any>(null)
  const [isEditEdgeModalVisible, setIsEditEdgeModalVisible] = useState(false)
  const [editingEdge, setEditingEdge] = useState<any>(null)
  const [isAddNodeModalVisible, setIsAddNodeModalVisible] = useState(false)
  const [isAddEdgeModalVisible, setIsAddEdgeModalVisible] = useState(false)

  // ノードを削除する処理
  const handleDeleteNode = async (nodeData: any, callback: any) => {
    const nodeIds = nodeData.nodes
    if (nodeIds.length === 0) {
      callback(null)
      return
    }

    const nodeLabels = nodeIds
      .map((id: number) => {
        const node = nodesDataSet.current.get(id)
        return node ? `ID:${id} - ${node.label}` : `ID:${id}`
      })
      .join('\n')

    Modal.confirm({
      title: 'ノードの削除',
      content: `以下のノードを削除しますか？\n\n${nodeLabels}\n\n※関連するエッジも削除されます`,
      okText: '削除',
      cancelText: 'キャンセル',
      okType: 'danger',
      async onOk() {
        try {
          // 関連するエッジを検索して削除
          const allEdges = edgesDataSet.current.get()
          const edgesToDelete = allEdges.filter(
            (edge: any) => nodeIds.includes(edge.from) || nodeIds.includes(edge.to)
          )

          // IndexedDBからエッジを削除
          for (const edge of edgesToDelete) {
            await deleteEdge(edge.id)
          }

          // IndexedDBからノードを削除
          for (const id of nodeIds) {
            await deleteNode(id)
          }
          callback(nodeData)
        } catch (error) {
          console.error('ノードの削除に失敗しました:', error)
          message.error('ノードの削除に失敗しました')
          callback(null)
        }
      },
      onCancel() {
        callback(null)
      },
    })
  }

  // エッジを削除する処理
  const handleDeleteEdge = async (edgeData: any, callback: any) => {
    const edgeIds = edgeData.edges
    if (edgeIds.length === 0) {
      callback(null)
      return
    }

    Modal.confirm({
      title: 'エッジの削除',
      content: '選択したエッジを削除しますか？',
      okText: '削除',
      cancelText: 'キャンセル',
      okType: 'danger',
      async onOk() {
        try {
          // IndexedDBから削除
          for (const id of edgeIds) {
            await deleteEdge(id)
          }
          callback(edgeData)
        } catch (error) {
          console.error('エッジの削除に失敗しました:', error)
          message.error('エッジの削除に失敗しました')
          callback(null)
        }
      },
      onCancel() {
        callback(null)
      },
    })
  }

  // ノードを編集する処理
  const handleEditNode = (nodeData: any, callback: any) => {
    const newLabel = prompt('新しいラベルを入力してください:', nodeData.label)
    if (newLabel !== null && newLabel.trim() !== '') {
      nodeData.label = newLabel.trim()
      try {
        saveNode(nodeData)
        callback(nodeData)
      } catch (error) {
        console.error('ノードの更新に失敗しました:', error)
        message.error('ノードの更新に失敗しました')
        callback(null)
      }
    } else {
      callback(null)
    }
  }

  // 選択されたノードを削除する
  const deleteSelectedNodes = async () => {
    if (selectedNodes.length === 0) {
      message.error('削除するノードを選択してください')
      return
    }

    const nodeLabels = selectedNodes
      .map((id: number) => {
        const node = nodesDataSet.current.get(id)
        return node ? `ID:${id} - ${node.label}` : `ID:${id}`
      })
      .join('\n')

    Modal.confirm({
      title: 'ノードの削除',
      content: `以下のノードを削除しますか？\n\n${nodeLabels}\n\n※関連するエッジも削除されます`,
      okText: '削除',
      cancelText: 'キャンセル',
      okType: 'danger',
      async onOk() {
        try {
          // 関連するエッジを検索して削除
          const allEdges = edgesDataSet.current.get()
          const edgesToDelete = allEdges.filter(
            (edge: any) => selectedNodes.includes(edge.from) || selectedNodes.includes(edge.to)
          )

          // IndexedDBからエッジを削除
          for (const edge of edgesToDelete) {
            await deleteEdge(edge.id)
          }

          // DataSetからエッジを削除
          if (edgesToDelete.length > 0) {
            edgesDataSet.current.remove(edgesToDelete.map((e: any) => e.id))
          }

          // IndexedDBからノードを削除
          for (const id of selectedNodes) {
            await deleteNode(id)
          }
          // DataSetからノードを削除
          nodesDataSet.current.remove(selectedNodes)
          setSelectedNodes([])
          message.success('ノードが削除されました')
        } catch (error) {
          console.error('ノードの削除に失敗しました:', error)
          message.error('ノードの削除に失敗しました')
        }
      },
    })
  }

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
            getOptions(handleDeleteNode, handleEditNode, handleDeleteEdge)
          )
          networkRef.current = network

          // 選択イベントを監視
          network.on('selectNode', (params: any) => {
            setSelectedNodes(params.nodes)
          })

          network.on('deselectNode', (params: any) => {
            setSelectedNodes(params.nodes)
          })
        }
      } catch (error) {
        console.error('データの読み込みに失敗しました:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()

    // Clickイベントハンドラを追加する
    network?.on('click', () => {})
  }, [updateTrigger])

  // 新しいノードを追加する
  const addNode = async () => {
    if (newNodeLabel.trim() === '') {
      message.error('ノードラベルを入力してください')
      return
    }

    const nodeConfig = getNodeConfig(selectedSize, selectedColor, selectedShape)
    const newNode = {
      id: nextNodeId,
      label: newNodeLabel,
      shape: nodeConfig.shape,
      font: { size: nodeConfig.font.size, color: '#000000' },
      margin: { top: 10, right: 10, bottom: 10, left: 10 },
      borderWidth: 1,
      size: nodeConfig.size,
      color: nodeConfig.color,
      // 設定情報を保存（編集時の復元用）
      nodeSize: selectedSize,
      nodeColor: selectedColor,
      nodeShape: selectedShape,
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
      message.error('データベースへのノード保存に失敗しました')
    }
  }

  // ノード追加モーダルを開く
  const openAddNodeModal = () => {
    setIsAddNodeModalVisible(true)
  }

  // ノード追加モーダルを閉じる
  const closeAddNodeModal = () => {
    setIsAddNodeModalVisible(false)
  }

  // ノードを追加してモーダルを閉じる
  const addNodeAndClose = async () => {
    await addNode()
    if (newNodeLabel.trim()) {
      closeAddNodeModal()
    }
  }

  // ドロップダウン用に全ノードを配列として取得
  const getNodesList = () => {
    return nodesDataSet.current.get() as Array<{ id: number; label: string }>
  }

  // 新しいエッジを追加する
  const addEdge = async () => {
    if (!edgeFrom || !edgeTo) {
      message.error('開始ノードと終了ノードを選択してください')
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
      message.error('データベースへのエッジ保存に失敗しました')
    }
  }

  // エッジ追加モーダルを開く
  const openAddEdgeModal = () => {
    setIsAddEdgeModalVisible(true)
  }

  // エッジ追加モーダルを閉じる
  const closeAddEdgeModal = () => {
    setIsAddEdgeModalVisible(false)
  }

  // エッジを追加してモーダルを閉じる
  const addEdgeAndClose = async () => {
    await addEdge()
    if (edgeFrom && edgeTo) {
      closeAddEdgeModal()
    }
  }

  // 全エッジリストを取得（テーブル表示用）
  const getEdgesList = () => {
    const edges = edgesDataSet.current.get()
    return edges.map((edge: any) => {
      const fromNodeArray = nodesDataSet.current.get(edge.from)
      const toNodeArray = nodesDataSet.current.get(edge.to)
      const fromNode = Array.isArray(fromNodeArray) ? fromNodeArray[0] : fromNodeArray
      const toNode = Array.isArray(toNodeArray) ? toNodeArray[0] : toNodeArray
      return {
        id: edge.id,
        from: edge.from,
        to: edge.to,
        fromLabel: fromNode?.label || '不明',
        toLabel: toNode?.label || '不明',
        label: edge.label || '',
      }
    })
  }

  // 全ノードリストを取得（テーブル表示用）
  const getNodesListForTable = () => {
    const nodes = nodesDataSet.current.get()
    return nodes.map((node: any) => {
      // このノードの接続数を計算
      const edges = edgesDataSet.current.get()
      const connectedEdges = edges.filter(
        (edge: any) => edge.from === node.id || edge.to === node.id
      )
      return {
        id: node.id,
        label: node.label,
        connections: connectedEdges.length,
      }
    })
  }

  // エッジ管理モーダルを開く
  const openEdgeModal = () => {
    setIsEdgeModalVisible(true)
    setEdgeSearchText('')
    setSelectedEdgeIds([])
  }

  // エッジ管理モーダルを閉じる
  const closeEdgeModal = () => {
    setIsEdgeModalVisible(false)
    setEdgeSearchText('')
    setSelectedEdgeIds([])
  }

  // ノード管理モーダルを開く
  const openNodeModal = () => {
    setIsNodeModalVisible(true)
    setNodeSearchText('')
    setSelectedNodeIdsInModal([])
  }

  // ノード管理モーダルを閉じる
  const closeNodeModal = () => {
    setIsNodeModalVisible(false)
    setNodeSearchText('')
    setSelectedNodeIdsInModal([])
  }

  // 選択されたノードを削除（モーダル内）
  const deleteNodesFromModal = () => {
    if (selectedNodeIdsInModal.length === 0) {
      message.error('削除するノードを選択してください')
      return
    }

    const nodeLabels = selectedNodeIdsInModal
      .map((id: number) => {
        const node = nodesDataSet.current.get(id)
        return node ? `ID:${id} - ${(node as any).label}` : `ID:${id}`
      })
      .join('\n')

    Modal.confirm({
      title: 'ノードの削除',
      content: `選択した ${selectedNodeIdsInModal.length} 個のノードを削除しますか？\n\n${nodeLabels}\n\n※関連するエッジも削除されます`,
      okText: '削除',
      cancelText: 'キャンセル',
      okType: 'danger',
      async onOk() {
        try {
          // 関連エッジを検索して削除
          const allEdges = edgesDataSet.current.get()
          const edgesToDelete = allEdges.filter(
            (edge: any) =>
              selectedNodeIdsInModal.includes(edge.from) || selectedNodeIdsInModal.includes(edge.to)
          )

          // IndexedDBからエッジを削除
          for (const edge of edgesToDelete) {
            await deleteEdge(edge.id)
          }

          // DataSetからエッジを削除
          if (edgesToDelete.length > 0) {
            edgesDataSet.current.remove(edgesToDelete.map((e: any) => e.id))
          }

          // IndexedDBからノードを削除
          for (const id of selectedNodeIdsInModal) {
            await deleteNode(id)
          }

          // DataSetからノードを削除
          nodesDataSet.current.remove(selectedNodeIdsInModal)
          setSelectedNodeIdsInModal([])
          message.success('ノードを削除しました')
          closeNodeModal()
        } catch (error) {
          console.error('ノードの削除に失敗:', error)
          message.error('ノードの削除に失敗しました')
        }
      },
    })
  }

  // ノード編集モーダルを開く
  const openEditNodeModal = (node: any) => {
    // 既存ノードから設定を取得、存在しない場合はデフォルト値を使用
    setEditingNode({
      ...node,
      nodeSize: node.nodeSize || 'medium',
      nodeColor: node.nodeColor || 'blue',
    })
    setIsEditNodeModalVisible(true)
  }

  // ノード編集モーダルを閉じる
  const closeEditNodeModal = () => {
    setEditingNode(null)
    setIsEditNodeModalVisible(false)
  }

  // 編集後のノードを保存
  const saveEditedNode = async () => {
    if (!editingNode || !editingNode.label.trim()) {
      message.error('ノード名を入力してください')
      return
    }

    try {
      const nodeInDataSet = nodesDataSet.current.get(editingNode.id)
      const nodeConfig = getNodeConfig(
        editingNode.nodeSize as keyof typeof SIZE_OPTIONS,
        editingNode.nodeColor as keyof typeof COLOR_OPTIONS,
        editingNode.shape as keyof typeof SHAPE_OPTIONS
      )

      const updatedNode = {
        ...nodeInDataSet,
        label: editingNode.label.trim(),
        shape: nodeConfig.shape,
        font: { size: nodeConfig.font.size, color: '#000000' },
        size: nodeConfig.size,
        color: nodeConfig.color,
        borderWidth: 1,
        // 設定情報を保存（編集時の復元用）
        nodeSize: editingNode.nodeSize,
        nodeColor: editingNode.nodeColor,
        nodeShape: editingNode.shape,
      }

      await saveNode(updatedNode)
      nodesDataSet.current.update(updatedNode)
      message.success('ノードが更新されました')
      closeEditNodeModal()
    } catch (error) {
      console.error('ノードの更新に失敗しました:', error)
      message.error('ノードの更新に失敗しました')
    }
  }

  // エッジ編集モーダルを開く
  const openEditEdgeModal = (edge: any) => {
    setEditingEdge(edge)
    setIsEditEdgeModalVisible(true)
  }

  // エッジ編集モーダルを閉じる
  const closeEditEdgeModal = () => {
    setEditingEdge(null)
    setIsEditEdgeModalVisible(false)
  }

  // 編集後のエッジを保存
  const saveEditedEdge = async () => {
    if (!editingEdge) {
      return
    }

    if (!editingEdge.from || !editingEdge.to) {
      message.error('開始ノードと終了ノードを選択してください')
      return
    }

    try {
      const edgeInDataSet = edgesDataSet.current.get(editingEdge.id)
      const updatedEdge = {
        ...edgeInDataSet,
        from: editingEdge.from,
        to: editingEdge.to,
        label: editingEdge.label || '',
      }

      await saveEdge(updatedEdge)
      edgesDataSet.current.update(updatedEdge)
      message.success('エッジが更新されました')
      closeEditEdgeModal()
    } catch (error) {
      console.error('エッジの更新に失敗しました:', error)
      message.error('エッジの更新に失敗しました')
    }
  }

  // 删除选中的边
  const deleteSelectedEdges = () => {
    if (selectedEdgeIds.length === 0) {
      message.error('削除するエッジを選択してください')
      return
    }

    Modal.confirm({
      title: 'エッジを削除',
      content: `選択した ${selectedEdgeIds.length} 件のエッジを削除しますか？`,
      okText: '削除',
      cancelText: 'キャンセル',
      okType: 'danger',
      async onOk() {
        try {
          for (const id of selectedEdgeIds) {
            await deleteEdge(id)
          }
          edgesDataSet.current.remove(selectedEdgeIds)
          setSelectedEdgeIds([])
          message.success('エッジが削除されました')
          closeEdgeModal()
        } catch (error) {
          console.error('エッジの削除に失敗しました:', error)
          message.error('エッジの削除に失敗しました')
        }
      },
    })
  }

  // 边表格的列定义
  const edgeColumns: ColumnsType<any> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: '開始ノード',
      dataIndex: 'fromLabel',
      key: 'fromLabel',
      sorter: (a, b) => a.fromLabel.localeCompare(b.fromLabel),
      filteredValue: edgeSearchText ? [edgeSearchText] : null,
      onFilter: (value, record) => {
        const searchText = value.toString().toLowerCase()
        return (
          record.fromLabel.toLowerCase().includes(searchText) ||
          record.toLabel.toLowerCase().includes(searchText) ||
          record.label.toLowerCase().includes(searchText) ||
          record.id.toString().includes(searchText)
        )
      },
    },
    {
      title: '終了ノード',
      dataIndex: 'toLabel',
      key: 'toLabel',
      sorter: (a, b) => a.toLabel.localeCompare(b.toLabel),
    },
    {
      title: 'ラベル',
      dataIndex: 'label',
      key: 'label',
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: any) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => openEditEdgeModal(record)}
        >
          編集
        </Button>
      ),
    },
  ]

  // 节点表格的列定义
  const nodeColumns: ColumnsType<any> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: 'ノード名',
      dataIndex: 'label',
      key: 'label',
      sorter: (a, b) => a.label.localeCompare(b.label),
      filteredValue: nodeSearchText ? [nodeSearchText] : null,
      onFilter: (value, record) => {
        const searchText = value.toString().toLowerCase()
        return (
          record.label.toLowerCase().includes(searchText) ||
          record.id.toString().includes(searchText)
        )
      },
    },
    {
      title: '接続数',
      dataIndex: 'connections',
      key: 'connections',
      width: 100,
      sorter: (a, b) => a.connections - b.connections,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: any) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => openEditNodeModal(record)}
        >
          編集
        </Button>
      ),
    },
  ]

  // 全データをクリア
  const handleClearData = () => {
    Modal.confirm({
      title: '全データの削除',
      content: 'すべてのデータを削除しますか？この操作は元に戻せません！',
      okText: '削除',
      cancelText: 'キャンセル',
      okType: 'danger',
      async onOk() {
        try {
          await clearAllData()
          nodesDataSet.current.clear()
          edgesDataSet.current.clear()
          setNextNodeId(1)
          setNextEdgeId(1)
          setUpdateTrigger((prev) => prev + 1)
          message.success('データが削除されました')
        } catch (error) {
          console.error('データの削除に失敗しました:', error)
          message.error('データの削除に失敗しました')
        }
      },
    })
  }

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <Spin size="large" />
        <Typography.Text>データ読み込み中...</Typography.Text>
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
      <Card
        style={{
          borderRadius: 0,
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography.Title
            level={3}
            style={{ margin: 0 }}
          >
            日本語コロケーション
          </Typography.Title>
          <Space wrap>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openAddNodeModal}
            >
              ノードを追加
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openAddEdgeModal}
            >
              エッジを追加
            </Button>

            <Button
              icon={<SettingOutlined />}
              onClick={openNodeModal}
            >
              ノード管理
            </Button>

            <Button
              icon={<SettingOutlined />}
              onClick={openEdgeModal}
            >
              エッジ管理
            </Button>

            {selectedNodes.length > 0 && (
              <Button
                type="default"
                danger
                icon={<DeleteOutlined />}
                onClick={deleteSelectedNodes}
              >
                選択ノードを削除 ({selectedNodes.length})
              </Button>
            )}

            <Button
              danger
              icon={<ClearOutlined />}
              onClick={handleClearData}
            >
              全データを削除
            </Button>
          </Space>
        </div>
      </Card>

      {/* Network Graph */}
      <div
        style={{ flex: 1, width: '100%', overflow: 'hidden' }}
        ref={ref}
      ></div>

      {/* エッジ管理モーダル */}
      <Modal
        title="エッジ管理"
        open={isEdgeModalVisible}
        onCancel={closeEdgeModal}
        width={800}
        footer={[
          <Button
            key="delete"
            danger
            icon={<DeleteOutlined />}
            onClick={deleteSelectedEdges}
            disabled={selectedEdgeIds.length === 0}
          >
            選択を削除 ({selectedEdgeIds.length})
          </Button>,
          <Button
            key="close"
            onClick={closeEdgeModal}
          >
            閉じる
          </Button>,
        ]}
      >
        <div style={{ marginBottom: '16px' }}>
          <Input
            placeholder="エッジを検索（ノード名、ラベルまたはID）"
            value={edgeSearchText}
            onChange={(e) => setEdgeSearchText(e.target.value)}
            style={{ width: '100%' }}
            allowClear
          />
        </div>
        <Table
          columns={edgeColumns}
          dataSource={getEdgesList()}
          rowKey="id"
          rowSelection={{
            selectedRowKeys: selectedEdgeIds,
            onChange: (selectedRowKeys) => {
              setSelectedEdgeIds(selectedRowKeys as number[])
            },
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `全 ${total} 件のエッジ`,
          }}
          scroll={{ y: 400 }}
        />
      </Modal>

      {/* ノード管理モーダル */}
      <Modal
        title="ノード管理"
        open={isNodeModalVisible}
        onCancel={closeNodeModal}
        width={800}
        footer={[
          <Button
            key="delete"
            danger
            icon={<DeleteOutlined />}
            onClick={deleteNodesFromModal}
            disabled={selectedNodeIdsInModal.length === 0}
          >
            選択を削除 ({selectedNodeIdsInModal.length})
          </Button>,
          <Button
            key="close"
            onClick={closeNodeModal}
          >
            閉じる
          </Button>,
        ]}
      >
        <div style={{ marginBottom: '16px' }}>
          <Input
            placeholder="ノードを検索（名前またはID）"
            value={nodeSearchText}
            onChange={(e) => setNodeSearchText(e.target.value)}
            style={{ width: '100%' }}
            allowClear
          />
        </div>
        <Table
          columns={nodeColumns}
          dataSource={getNodesListForTable()}
          rowKey="id"
          rowSelection={{
            selectedRowKeys: selectedNodeIdsInModal,
            onChange: (selectedRowKeys) => {
              setSelectedNodeIdsInModal(selectedRowKeys as number[])
            },
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `全 ${total} 件のノード`,
          }}
          scroll={{ y: 400 }}
        />
      </Modal>

      {/* ノード編集モーダル */}
      <Modal
        title="ノードを編集"
        open={isEditNodeModalVisible}
        onCancel={closeEditNodeModal}
        onOk={saveEditedNode}
        okText="保存"
        cancelText="キャンセル"
      >
        <Space
          direction="vertical"
          style={{ width: '100%' }}
        >
          <div>
            <Typography.Text strong>ノードID: </Typography.Text>
            <Typography.Text>{editingNode?.id}</Typography.Text>
          </div>
          <div>
            <Typography.Text strong>サイズ</Typography.Text>
            <Select
              value={editingNode?.nodeSize}
              onChange={(value) => setEditingNode({ ...editingNode, nodeSize: value })}
              style={{ width: '100%', marginTop: '8px' }}
            >
              {Object.entries(SIZE_OPTIONS).map(([key, value]) => (
                <Select.Option
                  key={key}
                  value={key}
                >
                  {value.name}
                </Select.Option>
              ))}
            </Select>
          </div>
          <div>
            <Typography.Text strong>カラー</Typography.Text>
            <Select
              value={editingNode?.nodeColor}
              onChange={(value) => setEditingNode({ ...editingNode, nodeColor: value })}
              style={{ width: '100%', marginTop: '8px' }}
            >
              {Object.entries(COLOR_OPTIONS).map(([key, value]) => (
                <Select.Option
                  key={key}
                  value={key}
                >
                  {value.name}
                </Select.Option>
              ))}
            </Select>
          </div>
          <div>
            <Typography.Text strong>形状</Typography.Text>
            <Select
              value={editingNode?.shape}
              onChange={(value) => setEditingNode({ ...editingNode, shape: value })}
              style={{ width: '100%', marginTop: '8px' }}
            >
              {Object.entries(SHAPE_OPTIONS).map(([key, value]) => (
                <Select.Option
                  key={key}
                  value={key}
                >
                  {value.name}
                </Select.Option>
              ))}
            </Select>
          </div>
          <div>
            <Typography.Text strong>ノード名</Typography.Text>
            <Input
              value={editingNode?.label}
              onChange={(e) => setEditingNode({ ...editingNode, label: e.target.value })}
              placeholder="ノード名を入力"
              style={{ marginTop: '8px' }}
            />
          </div>
          <div>
            <Typography.Text strong>プレビュー</Typography.Text>
            <div
              style={{
                marginTop: '8px',
                padding: '24px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                background: '#fafafa',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100px',
              }}
            >
              {editingNode?.nodeSize && editingNode?.nodeColor && editingNode?.shape && (
                <div
                  style={{
                    width: SIZE_OPTIONS[editingNode.nodeSize as keyof typeof SIZE_OPTIONS].size * 3,
                    height:
                      SIZE_OPTIONS[editingNode.nodeSize as keyof typeof SIZE_OPTIONS].size * 3,
                    borderRadius:
                      editingNode.shape === 'circle'
                        ? '50%'
                        : editingNode.shape === 'ellipse'
                        ? '50%'
                        : editingNode.shape === 'box'
                        ? '8px'
                        : '0',
                    border: `3px solid ${
                      COLOR_OPTIONS[editingNode.nodeColor as keyof typeof COLOR_OPTIONS].border
                    }`,
                    background:
                      COLOR_OPTIONS[editingNode.nodeColor as keyof typeof COLOR_OPTIONS].background,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: SIZE_OPTIONS[editingNode.nodeSize as keyof typeof SIZE_OPTIONS].font,
                    fontWeight: 'normal',
                    color: '#000000',
                  }}
                >
                  {editingNode?.label || 'ノード名'}
                </div>
              )}
            </div>
          </div>
        </Space>
      </Modal>

      {/* エッジ編集モーダル */}
      <Modal
        title="エッジを編集"
        open={isEditEdgeModalVisible}
        onCancel={closeEditEdgeModal}
        onOk={saveEditedEdge}
        okText="保存"
        cancelText="キャンセル"
      >
        <Space
          direction="vertical"
          style={{ width: '100%' }}
        >
          <div>
            <Typography.Text strong>エッジID: </Typography.Text>
            <Typography.Text>{editingEdge?.id}</Typography.Text>
          </div>
          <div>
            <Typography.Text strong>開始ノード</Typography.Text>
            <Select
              value={editingEdge?.from}
              onChange={(value) => setEditingEdge({ ...editingEdge, from: value })}
              style={{ width: '100%', marginTop: '8px' }}
              showSearch
              optionFilterProp="children"
              placeholder="開始ノードを選択"
            >
              {getNodesList().map((node) => (
                <Select.Option
                  key={node.id}
                  value={node.id}
                >
                  ID:{node.id} - {node.label}
                </Select.Option>
              ))}
            </Select>
          </div>
          <div>
            <Typography.Text strong>終了ノード</Typography.Text>
            <Select
              value={editingEdge?.to}
              onChange={(value) => setEditingEdge({ ...editingEdge, to: value })}
              style={{ width: '100%', marginTop: '8px' }}
              showSearch
              optionFilterProp="children"
              placeholder="終了ノードを選択"
            >
              {getNodesList().map((node) => (
                <Select.Option
                  key={node.id}
                  value={node.id}
                >
                  ID:{node.id} - {node.label}
                </Select.Option>
              ))}
            </Select>
          </div>
          <div>
            <Typography.Text strong>エッジラベル</Typography.Text>
            <Input
              value={editingEdge?.label}
              onChange={(e) => setEditingEdge({ ...editingEdge, label: e.target.value })}
              placeholder="エッジラベルを入力（任意）"
              style={{ marginTop: '8px' }}
            />
          </div>
        </Space>
      </Modal>

      {/* ノード追加モーダル */}
      <Modal
        title="ノードを追加"
        open={isAddNodeModalVisible}
        onCancel={closeAddNodeModal}
        onOk={addNodeAndClose}
        okText="追加"
        cancelText="キャンセル"
      >
        <Space
          direction="vertical"
          style={{ width: '100%' }}
        >
          <div>
            <Typography.Text strong>サイズ</Typography.Text>
            <Select
              value={selectedSize}
              onChange={(value) => setSelectedSize(value as keyof typeof SIZE_OPTIONS)}
              style={{ width: '100%', marginTop: '8px' }}
            >
              {Object.entries(SIZE_OPTIONS).map(([key, value]) => (
                <Select.Option
                  key={key}
                  value={key}
                >
                  {value.name}
                </Select.Option>
              ))}
            </Select>
          </div>
          <div>
            <Typography.Text strong>カラー</Typography.Text>
            <Select
              value={selectedColor}
              onChange={(value) => setSelectedColor(value as keyof typeof COLOR_OPTIONS)}
              style={{ width: '100%', marginTop: '8px' }}
            >
              {Object.entries(COLOR_OPTIONS).map(([key, value]) => (
                <Select.Option
                  key={key}
                  value={key}
                >
                  {value.name}
                </Select.Option>
              ))}
            </Select>
          </div>
          <div>
            <Typography.Text strong>形状</Typography.Text>
            <Select
              value={selectedShape}
              onChange={(value) => setSelectedShape(value as keyof typeof SHAPE_OPTIONS)}
              style={{ width: '100%', marginTop: '8px' }}
            >
              {Object.entries(SHAPE_OPTIONS).map(([key, value]) => (
                <Select.Option
                  key={key}
                  value={key}
                >
                  {value.name}
                </Select.Option>
              ))}
            </Select>
          </div>
          <div>
            <Typography.Text strong>ノード名</Typography.Text>
            <Input
              placeholder="ノード名を入力"
              value={newNodeLabel}
              onChange={(e) => setNewNodeLabel(e.target.value)}
              onPressEnter={addNodeAndClose}
              style={{ marginTop: '8px' }}
            />
          </div>
          <div>
            <Typography.Text strong>プレビュー</Typography.Text>
            <div
              style={{
                marginTop: '8px',
                padding: '24px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                background: '#fafafa',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100px',
              }}
            >
              <div
                style={{
                  width: SIZE_OPTIONS[selectedSize].size * 3,
                  height: SIZE_OPTIONS[selectedSize].size * 3,
                  borderRadius:
                    selectedShape === 'circle'
                      ? '50%'
                      : selectedShape === 'ellipse'
                      ? '50%'
                      : selectedShape === 'box'
                      ? '8px'
                      : '0',
                  border: `3px solid ${COLOR_OPTIONS[selectedColor].border}`,
                  background: COLOR_OPTIONS[selectedColor].background,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontSize: SIZE_OPTIONS[selectedSize].font,
                  fontWeight: 'normal',
                  color: '#000000',
                }}
              >
                {newNodeLabel || 'ノード名'}
              </div>
            </div>
          </div>
          <div>
            <Typography.Text
              type="secondary"
              style={{ fontSize: '12px' }}
            >
              次のノードID: {nextNodeId}
            </Typography.Text>
          </div>
        </Space>
      </Modal>

      {/* エッジ追加モーダル */}
      <Modal
        title="エッジを追加"
        open={isAddEdgeModalVisible}
        onCancel={closeAddEdgeModal}
        onOk={addEdgeAndClose}
        okText="追加"
        cancelText="キャンセル"
      >
        <Space
          direction="vertical"
          style={{ width: '100%' }}
        >
          <div>
            <Typography.Text strong>開始ノード</Typography.Text>
            <Select
              placeholder="開始ノードを選択"
              value={edgeFrom || undefined}
              onChange={(value) => setEdgeFrom(value)}
              style={{ width: '100%', marginTop: '8px' }}
              showSearch
              optionFilterProp="children"
            >
              {getNodesList().map((node) => (
                <Select.Option
                  key={node.id}
                  value={node.id}
                >
                  ID:{node.id} - {node.label}
                </Select.Option>
              ))}
            </Select>
          </div>
          <div>
            <Typography.Text strong>終了ノード</Typography.Text>
            <Select
              placeholder="終了ノードを選択"
              value={edgeTo || undefined}
              onChange={(value) => setEdgeTo(value)}
              style={{ width: '100%', marginTop: '8px' }}
              showSearch
              optionFilterProp="children"
            >
              {getNodesList().map((node) => (
                <Select.Option
                  key={node.id}
                  value={node.id}
                >
                  ID:{node.id} - {node.label}
                </Select.Option>
              ))}
            </Select>
          </div>
          <div>
            <Typography.Text strong>エッジラベル（任意）</Typography.Text>
            <Input
              placeholder="エッジラベルを入力"
              value={edgeLabel}
              onChange={(e) => setEdgeLabel(e.target.value)}
              onPressEnter={addEdgeAndClose}
              style={{ marginTop: '8px' }}
            />
          </div>
        </Space>
      </Modal>
    </div>
  )
}
export default NetworkGraph
