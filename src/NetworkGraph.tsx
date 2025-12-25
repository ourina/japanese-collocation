import { Network } from 'vis-network'
import { DataSet } from 'vis-data'
import { useRef, useEffect } from 'react'

function NetworkGraph() {
  // create an array with nodes
  var nodes = new DataSet([
    {
      id: 1,
      label: '例外',
      shape: 'circle',
      font: { size: 24, color: '#2c0000ff' },
      margin: { top: 10, right: 10, bottom: 10, left: 10 },
      borderWidth: 2,
      color: {
        border: '#f18136ff',
        background: '#f7e0d3ff',
        highlight: {
          border: '#ec3535ff',
          background: '#f8ada7ff',
        },
      },
    },
    { id: 2, label: '発生する' },
  ])

  // create an array with edges
  var edges = new DataSet([
    {
      id: 1,
      from: 1,
      to: 2,
      label: 'が',
      length: 150,
      font: { size: 16, color: '#000000ff', align: 'top' },
      arrows: {
        to: {
          enabled: true,
          scaleFactor: 1,
          type: 'arrow',
        },
      },
    },
  ])

  // create a network
  /** DOMを参照できるように useRef を使用して Element を取得する */
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const options = {
      autoResize: true,
      height: document.body.scrollHeight + 'px',
      width: document.body.scrollWidth + 'px',
      locale: 'jp',
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
    let network: Network | null = null

    // Network が存在しない場合の処理
    if (!network && ref.current) {
      // Network Instance を作成して、DataをSetする => new Network(Dom領域, Data(Nodes & Edges), Options)
      network = new Network(
        ref.current,
        {
          nodes: nodes,
          edges: edges,
        },
        options
      )
    }

    // Click イベントハンドラ を追加する
    network?.on('click', (params: { nodes: number[] }) => {})
  }, [])

  return (
    <div
      style={{ width: '100vw', height: '100vh' }}
      ref={ref}
    ></div>
  )
}
export default NetworkGraph
