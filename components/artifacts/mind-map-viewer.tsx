
"use client"

import { useMemo, useCallback } from "react"
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    Panel,
    Node,
    Edge,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { useCopilotReadable } from "@copilotkit/react-core"
import { Download, Maximize2, Share2, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MindMapNode {
    id: string
    label: string
    children?: MindMapNode[]
}

interface MindMapData {
    root: MindMapNode
}

interface MindMapViewerProps {
    data: MindMapData
    title: string
}

export function MindMapViewer({ data, title }: MindMapViewerProps) {
    // Expose mind map data to AI context
    useCopilotReadable({
        description: `Mapa mental atual: ${title}`,
        value: data
    })

    // Convert tree to React Flow format
    const { initialNodes, initialEdges } = useMemo(() => {
        const nodes: Node[] = []
        const edges: Edge[] = []
        let nodeSeq = 0

        if (!data || !data.root) return { initialNodes: [], initialEdges: [] }

        const traverse = (node: MindMapNode, parentId?: string, x = 0, y = 0, level = 0) => {
            const id = node.id || `node-${++nodeSeq}`

            // Calculate position (simple layout)
            const nodeX = x
            const nodeY = y

            nodes.push({
                id,
                data: { label: node.label },
                position: { x: nodeX, y: nodeY },
                type: level === 0 ? "input" : (node.children?.length ? "default" : "output"),
                style: {
                    background: level === 0 ? "#ec4899" : (node.children?.length ? "#fdf2f8" : "#ffffff"),
                    color: level === 0 ? "#ffffff" : "#334155",
                    borderRadius: "12px",
                    padding: "10px 15px",
                    fontWeight: level === 0 ? "700" : "500",
                    border: level === 0 ? "none" : "1px solid #fbcfe8",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    width: 180,
                    textAlign: "center"
                }
            })

            if (parentId) {
                edges.push({
                    id: `e-${parentId}-${id}`,
                    source: parentId,
                    target: id,
                    animated: level < 2,
                    style: { stroke: "#f472b6", strokeWidth: 2 },
                })
            }

            if (node.children) {
                const childSpacingX = 250
                const childSpacingY = 100
                const totalHeight = (node.children.length - 1) * childSpacingY

                node.children.forEach((child, index) => {
                    traverse(
                        child,
                        id,
                        x + childSpacingX,
                        y - (totalHeight / 2) + (index * childSpacingY),
                        level + 1
                    )
                })
            }
        }

        traverse(data.root)
        return { initialNodes: nodes, initialEdges: edges }
    }, [data])

    const [nodes, , onNodesChange] = useNodesState(initialNodes)
    const [edges, , onEdgesChange] = useEdgesState(initialEdges)

    if (!data || !data.root) {
        return (
            <div className="flex items-center justify-center min-h-[400px] border border-dashed rounded-3xl text-slate-400">
                Aguardando dados do mapa mental...
            </div>
        )
    }

    return (
        <div className="h-[600px] w-full bg-slate-50 dark:bg-slate-950 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 relative group shadow-inner">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
                className="bg-dot-pattern"
            >
                <Background color="#fbcfe8" gap={20} size={1} />
                <Controls showInteractive={false} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 fill-pink-500" />
                <MiniMap
                    nodeColor={(n) => (n.style?.background as string) || "#fff"}
                    className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-xl border-slate-200 dark:border-slate-800"
                />

                <Panel position="top-right" className="flex gap-2 p-2">
                    <Button variant="outline" size="icon" className="h-9 w-9 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-full shadow-sm">
                        <Share2 className="w-4 h-4 text-slate-600" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-9 w-9 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-full shadow-sm">
                        <Download className="w-4 h-4 text-slate-600" />
                    </Button>
                </Panel>

                <Panel position="bottom-center" className="mb-4">
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-full border border-pink-100 dark:border-pink-900/30 flex items-center gap-4 shadow-lg shadow-pink-500/5">
                        <div className="flex items-center gap-1">
                            <ZoomOut className="w-3 h-3 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ajuste o Zoom</span>
                            <ZoomIn className="w-3 h-3 text-slate-400" />
                        </div>
                        <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800" />
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-pink-600 dark:text-pink-400">Interativo</span>
                            <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                        </div>
                    </div>
                </Panel>
            </ReactFlow>
        </div>
    )
}
