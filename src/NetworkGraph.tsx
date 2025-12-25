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

// ノードタイプの定義 - 美化配色方案
const NODE_TYPES = {
  large_red: {
    name: '大（赤）',
    size: 30,
    color: {
      border: '#e91e63',
      background: '#ffe4e6',
      highlight: { border: '#c2185b', background: '#f06292' },
    },
  },
  large_blue: {
    name: '大（青）',
    size: 30,
    color: {
      border: '#2196f3',
      background: '#e3f2fd',
      highlight: { border: '#1976d2', background: '#64b5f6' },
    },
  },
  large_green: {
    name: '大（緑）',
    size: 30,
    color: {
      border: '#4caf50',
      background: '#e8f5e9',
      highlight: { border: '#388e3c', background: '#81c784' },
    },
  },
  large_purple: {
    name: '大（紫）',
    size: 30,
    color: {
      border: '#9c27b0',
      background: '#f3e5f5',
      highlight: { border: '#7b1fa2', background: '#ba68c8' },
    },
  },
  large_orange: {
    name: '大（橙）',
    size: 30,
    color: {
      border: '#ff9800',
      background: '#fff3e0',
      highlight: { border: '#f57c00', background: '#ffb74d' },
    },
  },
  medium_red: {
    name: '中（赤）',
    size: 24,
    color: {
      border: '#ec407a',
      background: '#fce4ec',
      highlight: { border: '#d81b60', background: '#f06292' },
    },
  },
  medium_blue: {
    name: '中（青）',
    size: 24,
    color: {
      border: '#42a5f5',
      background: '#e3f2fd',
      highlight: { border: '#1e88e5', background: '#64b5f6' },
    },
  },
  medium_green: {
    name: '中（緑）',
    size: 24,
    color: {
      border: '#66bb6a',
      background: '#e8f5e9',
      highlight: { border: '#43a047', background: '#81c784' },
    },
  },
  medium_purple: {
    name: '中（紫）',
    size: 24,
    color: {
      border: '#ab47bc',
      background: '#f3e5f5',
      highlight: { border: '#8e24aa', background: '#ba68c8' },
    },
  },
  medium_orange: {
    name: '中（橙）',
    size: 24,
    color: {
      border: '#ffa726',
      background: '#fff3e0',
      highlight: { border: '#fb8c00', background: '#ffb74d' },
    },
  },
  small_red: {
    name: '小（赤）',
    size: 18,
    color: {
      border: '#f06292',
      background: '#ffffff',
      highlight: { border: '#ec407a', background: '#ffcdd2' },
    },
  },
  small_blue: {
    name: '小（青）',
    size: 18,
    color: {
      border: '#64b5f6',
      background: '#ffffff',
      highlight: { border: '#42a5f5', background: '#bbdefb' },
    },
  },
  small_green: {
    name: '小（緑）',
    size: 18,
    color: {
      border: '#81c784',
      background: '#ffffff',
      highlight: { border: '#66bb6a', background: '#c8e6c9' },
    },
  },
  small_purple: {
    name: '小（紫）',
    size: 18,
    color: {
      border: '#ba68c8',
      background: '#ffffff',
      highlight: { border: '#ab47bc', background: '#e1bee7' },
    },
  },
  small_orange: {
    name: '小（橙）',
    size: 18,
    color: {
      border: '#ffb74d',
      background: '#ffffff',
      highlight: { border: '#ffa726', background: '#ffe0b2' },
    },
  },
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
  const [selectedNodeType, setSelectedNodeType] = useState<keyof typeof NODE_TYPES>('medium_blue')

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
    network?.on('click', (params: { nodes: number[] }) => {})
  }, [updateTrigger])

  // 新しいノードを追加する
  const addNode = async () => {
    if (newNodeLabel.trim() === '') {
      message.error('ノードラベルを入力してください')
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
      message.error('データベースへのノード保存に失敗しました')
    }
  }

  // 打开添加节点模态框
  const openAddNodeModal = () => {
    setIsAddNodeModalVisible(true)
  }

  // 关闭添加节点模态框
  const closeAddNodeModal = () => {
    setIsAddNodeModalVisible(false)
  }

  // 添加节点并关闭模态框
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

  // 打开添加边模态框
  const openAddEdgeModal = () => {
    setIsAddEdgeModalVisible(true)
  }

  // 关闭添加边模态框
  const closeAddEdgeModal = () => {
    setIsAddEdgeModalVisible(false)
  }

  // 添加边并关闭模态框
  const addEdgeAndClose = async () => {
    await addEdge()
    if (edgeFrom && edgeTo) {
      closeAddEdgeModal()
    }
  }

  // 获取所有边的列表（用于表格显示）
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
        fromLabel: fromNode?.label || '未知',
        toLabel: toNode?.label || '未知',
        label: edge.label || '',
      }
    })
  }

  // 获取所有节点的列表（用于表格显示）
  const getNodesListForTable = () => {
    const nodes = nodesDataSet.current.get()
    return nodes.map((node: any) => {
      // 统计该节点的连接数
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

  // 打开边管理模态框
  const openEdgeModal = () => {
    setIsEdgeModalVisible(true)
    setEdgeSearchText('')
    setSelectedEdgeIds([])
  }

  // 关闭边管理模态框
  const closeEdgeModal = () => {
    setIsEdgeModalVisible(false)
    setEdgeSearchText('')
    setSelectedEdgeIds([])
  }

  // 打开节点管理模态框
  const openNodeModal = () => {
    setIsNodeModalVisible(true)
    setNodeSearchText('')
    setSelectedNodeIdsInModal([])
  }

  // 关闭节点管理模态框
  const closeNodeModal = () => {
    setIsNodeModalVisible(false)
    setNodeSearchText('')
    setSelectedNodeIdsInModal([])
  }

  // 删除选中的节点（模态框中）
  const deleteNodesFromModal = () => {
    if (selectedNodeIdsInModal.length === 0) {
      message.error('请选择要删除的节点')
      return
    }

    const nodeLabels = selectedNodeIdsInModal
      .map((id: number) => {
        const node = nodesDataSet.current.get(id)
        return node ? `ID:${id} - ${(node as any).label}` : `ID:${id}`
      })
      .join('\n')

    Modal.confirm({
      title: '节点删除',
      content: `确定要删除选中的 ${selectedNodeIdsInModal.length} 个节点吗？\n\n${nodeLabels}\n\n※关联的边也将被删除`,
      okText: '删除',
      cancelText: '取消',
      okType: 'danger',
      async onOk() {
        try {
          // 查找并删除关联的边
          const allEdges = edgesDataSet.current.get()
          const edgesToDelete = allEdges.filter(
            (edge: any) =>
              selectedNodeIdsInModal.includes(edge.from) || selectedNodeIdsInModal.includes(edge.to)
          )

          // 从 IndexedDB 删除边
          for (const edge of edgesToDelete) {
            await deleteEdge(edge.id)
          }

          // 从 DataSet 删除边
          if (edgesToDelete.length > 0) {
            edgesDataSet.current.remove(edgesToDelete.map((e: any) => e.id))
          }

          // 从 IndexedDB 删除节点
          for (const id of selectedNodeIdsInModal) {
            await deleteNode(id)
          }

          // 从 DataSet 删除节点
          nodesDataSet.current.remove(selectedNodeIdsInModal)
          setSelectedNodeIdsInModal([])
          message.success('节点已删除')
          closeNodeModal()
        } catch (error) {
          console.error('节点删除失败:', error)
          message.error('节点删除失败')
        }
      },
    })
  }

  // 打开编辑节点模态框
  const openEditNodeModal = (node: any) => {
    setEditingNode({ ...node, nodeType: 'medium_blue' })
    setIsEditNodeModalVisible(true)
  }

  // 关闭编辑节点模态框
  const closeEditNodeModal = () => {
    setEditingNode(null)
    setIsEditNodeModalVisible(false)
  }

  // 保存编辑后的节点
  const saveEditedNode = async () => {
    if (!editingNode || !editingNode.label.trim()) {
      message.error('请输入节点名称')
      return
    }

    try {
      const nodeInDataSet = nodesDataSet.current.get(editingNode.id)
      const nodeTypeConfig = NODE_TYPES[editingNode.nodeType as keyof typeof NODE_TYPES]

      const updatedNode = {
        ...nodeInDataSet,
        label: editingNode.label.trim(),
        font: { size: nodeTypeConfig.size, color: '#000000' },
        color: nodeTypeConfig.color,
      }

      await saveNode(updatedNode)
      nodesDataSet.current.update(updatedNode)
      message.success('节点已更新')
      closeEditNodeModal()
    } catch (error) {
      console.error('节点更新失败:', error)
      message.error('节点更新失败')
    }
  }

  // 打开编辑边模态框
  const openEditEdgeModal = (edge: any) => {
    setEditingEdge(edge)
    setIsEditEdgeModalVisible(true)
  }

  // 关闭编辑边模态框
  const closeEditEdgeModal = () => {
    setEditingEdge(null)
    setIsEditEdgeModalVisible(false)
  }

  // 保存编辑后的边
  const saveEditedEdge = async () => {
    if (!editingEdge) {
      return
    }

    if (!editingEdge.from || !editingEdge.to) {
      message.error('请选择开始节点和结束节点')
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
      message.success('边已更新')
      closeEditEdgeModal()
    } catch (error) {
      console.error('边更新失败:', error)
      message.error('边更新失败')
    }
  }

  // 删除选中的边
  const deleteSelectedEdges = () => {
    if (selectedEdgeIds.length === 0) {
      message.error('请选择要删除的边')
      return
    }

    Modal.confirm({
      title: '删除边',
      content: `确定要删除选中的 ${selectedEdgeIds.length} 条边吗？`,
      okText: '删除',
      cancelText: '取消',
      okType: 'danger',
      async onOk() {
        try {
          for (const id of selectedEdgeIds) {
            await deleteEdge(id)
          }
          edgesDataSet.current.remove(selectedEdgeIds)
          setSelectedEdgeIds([])
          message.success('边已删除')
          closeEdgeModal()
        } catch (error) {
          console.error('边删除失败:', error)
          message.error('边删除失败')
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
      title: '开始节点',
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
      title: '结束节点',
      dataIndex: 'toLabel',
      key: 'toLabel',
      sorter: (a, b) => a.toLabel.localeCompare(b.toLabel),
    },
    {
      title: '标签',
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
          编辑
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
      title: '节点名称',
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
      title: '连接数',
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
          编辑
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
              添加节点
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openAddEdgeModal}
            >
              添加边
            </Button>

            <Button
              icon={<SettingOutlined />}
              onClick={openNodeModal}
            >
              管理节点
            </Button>

            <Button
              icon={<SettingOutlined />}
              onClick={openEdgeModal}
            >
              管理边
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

      {/* 边管理模态框 */}
      <Modal
        title="边管理"
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
            删除选中 ({selectedEdgeIds.length})
          </Button>,
          <Button
            key="close"
            onClick={closeEdgeModal}
          >
            关闭
          </Button>,
        ]}
      >
        <div style={{ marginBottom: '16px' }}>
          <Input
            placeholder="搜索边（节点名称、标签或ID）"
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
            showTotal: (total) => `共 ${total} 条边`,
          }}
          scroll={{ y: 400 }}
        />
      </Modal>

      {/* 节点管理模态框 */}
      <Modal
        title="节点管理"
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
            删除选中 ({selectedNodeIdsInModal.length})
          </Button>,
          <Button
            key="close"
            onClick={closeNodeModal}
          >
            关闭
          </Button>,
        ]}
      >
        <div style={{ marginBottom: '16px' }}>
          <Input
            placeholder="搜索节点（名称或ID）"
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
            showTotal: (total) => `共 ${total} 个节点`,
          }}
          scroll={{ y: 400 }}
        />
      </Modal>

      {/* 编辑节点模态框 */}
      <Modal
        title="编辑节点"
        open={isEditNodeModalVisible}
        onCancel={closeEditNodeModal}
        onOk={saveEditedNode}
        okText="保存"
        cancelText="取消"
      >
        <Space
          direction="vertical"
          style={{ width: '100%' }}
        >
          <div>
            <Typography.Text strong>节点ID: </Typography.Text>
            <Typography.Text>{editingNode?.id}</Typography.Text>
          </div>
          <div>
            <Typography.Text strong>节点类型</Typography.Text>
            <Select
              value={editingNode?.nodeType}
              onChange={(value) => setEditingNode({ ...editingNode, nodeType: value })}
              style={{ width: '100%', marginTop: '8px' }}
            >
              {Object.entries(NODE_TYPES).map(([key, value]) => (
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
            <Typography.Text strong>节点名称</Typography.Text>
            <Input
              value={editingNode?.label}
              onChange={(e) => setEditingNode({ ...editingNode, label: e.target.value })}
              placeholder="请输入节点名称"
              style={{ marginTop: '8px' }}
            />
          </div>
          <div>
            <Typography.Text strong>预览</Typography.Text>
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
              {editingNode?.nodeType && (
                <div
                  style={{
                    width: NODE_TYPES[editingNode.nodeType as keyof typeof NODE_TYPES].size * 3,
                    height: NODE_TYPES[editingNode.nodeType as keyof typeof NODE_TYPES].size * 3,
                    borderRadius: '50%',
                    border: `3px solid ${
                      NODE_TYPES[editingNode.nodeType as keyof typeof NODE_TYPES].color.border
                    }`,
                    background:
                      NODE_TYPES[editingNode.nodeType as keyof typeof NODE_TYPES].color.background,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: NODE_TYPES[editingNode.nodeType as keyof typeof NODE_TYPES].size,
                    fontWeight: 'normal',
                    color: '#000000',
                  }}
                >
                  {editingNode?.label || '节点名称'}
                </div>
              )}
            </div>
          </div>
        </Space>
      </Modal>

      {/* 编辑边模态框 */}
      <Modal
        title="编辑边"
        open={isEditEdgeModalVisible}
        onCancel={closeEditEdgeModal}
        onOk={saveEditedEdge}
        okText="保存"
        cancelText="取消"
      >
        <Space
          direction="vertical"
          style={{ width: '100%' }}
        >
          <div>
            <Typography.Text strong>边ID: </Typography.Text>
            <Typography.Text>{editingEdge?.id}</Typography.Text>
          </div>
          <div>
            <Typography.Text strong>开始节点</Typography.Text>
            <Select
              value={editingEdge?.from}
              onChange={(value) => setEditingEdge({ ...editingEdge, from: value })}
              style={{ width: '100%', marginTop: '8px' }}
              showSearch
              optionFilterProp="children"
              placeholder="选择开始节点"
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
            <Typography.Text strong>结束节点</Typography.Text>
            <Select
              value={editingEdge?.to}
              onChange={(value) => setEditingEdge({ ...editingEdge, to: value })}
              style={{ width: '100%', marginTop: '8px' }}
              showSearch
              optionFilterProp="children"
              placeholder="选择结束节点"
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
            <Typography.Text strong>边标签</Typography.Text>
            <Input
              value={editingEdge?.label}
              onChange={(e) => setEditingEdge({ ...editingEdge, label: e.target.value })}
              placeholder="请输入边标签（可选）"
              style={{ marginTop: '8px' }}
            />
          </div>
        </Space>
      </Modal>

      {/* 添加节点模态框 */}
      <Modal
        title="添加节点"
        open={isAddNodeModalVisible}
        onCancel={closeAddNodeModal}
        onOk={addNodeAndClose}
        okText="添加"
        cancelText="取消"
      >
        <Space
          direction="vertical"
          style={{ width: '100%' }}
        >
          <div>
            <Typography.Text strong>节点类型</Typography.Text>
            <Select
              value={selectedNodeType}
              onChange={(value) => setSelectedNodeType(value as keyof typeof NODE_TYPES)}
              style={{ width: '100%', marginTop: '8px' }}
            >
              {Object.entries(NODE_TYPES).map(([key, value]) => (
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
            <Typography.Text strong>节点名称</Typography.Text>
            <Input
              placeholder="请输入节点名称"
              value={newNodeLabel}
              onChange={(e) => setNewNodeLabel(e.target.value)}
              onPressEnter={addNodeAndClose}
              style={{ marginTop: '8px' }}
            />
          </div>
          <div>
            <Typography.Text strong>预览</Typography.Text>
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
                  width: NODE_TYPES[selectedNodeType].size * 3,
                  height: NODE_TYPES[selectedNodeType].size * 3,
                  borderRadius: '50%',
                  border: `3px solid ${NODE_TYPES[selectedNodeType].color.border}`,
                  background: NODE_TYPES[selectedNodeType].color.background,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontSize: NODE_TYPES[selectedNodeType].size,
                  fontWeight: 'normal',
                  color: '#000000',
                }}
              >
                {newNodeLabel || '节点名称'}
              </div>
            </div>
          </div>
          <div>
            <Typography.Text
              type="secondary"
              style={{ fontSize: '12px' }}
            >
              下一个节点ID: {nextNodeId}
            </Typography.Text>
          </div>
        </Space>
      </Modal>

      {/* 添加边模态框 */}
      <Modal
        title="添加边"
        open={isAddEdgeModalVisible}
        onCancel={closeAddEdgeModal}
        onOk={addEdgeAndClose}
        okText="添加"
        cancelText="取消"
      >
        <Space
          direction="vertical"
          style={{ width: '100%' }}
        >
          <div>
            <Typography.Text strong>开始节点</Typography.Text>
            <Select
              placeholder="选择开始节点"
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
            <Typography.Text strong>结束节点</Typography.Text>
            <Select
              placeholder="选择结束节点"
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
            <Typography.Text strong>边标签（可选）</Typography.Text>
            <Input
              placeholder="请输入边标签"
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
