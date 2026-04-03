"use client"

import { useState, useEffect, useCallback } from "react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { 
  getKanbanColumns, 
  getKanbanCards, 
  updateKanbanCard, 
  updateKanbanCardPosition 
} from "@/app/actions/kanban"
import { Plus, X, GripVertical, Trash2, Edit2, Check, Clock, AlertCircle } from "lucide-react"

export default function KanbanBoard({ userId, userRole }) {
  const [columns, setColumns] = useState([])
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Fetch columns and cards
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [colsData, cardsData] = await Promise.all([
        getKanbanColumns(),
        getKanbanCards(userId)
      ])
      setColumns(colsData || [])
      setCards(cardsData || [])
    } catch (err) {
      console.error("Failed to fetch kanban data:", err)
      setError("看板データの取得に失敗しました。")
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result

    if (!destination) return

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    // Optimistic UI update
    const oldCards = JSON.parse(JSON.stringify(cards))
    const movingCard = cards.find(c => String(c.id) === String(draggableId))
    if (!movingCard) return

    // Create a copy of all cards for manipulation
    let updatedCards = [...cards]
    
    // 1. Remove the moving card from its current position
    updatedCards = updatedCards.filter(c => String(c.id) !== String(draggableId))
    
    // 2. Update the moving card's column_id
    const updatedMovingCard = {
      ...movingCard,
      column_id: destination.droppableId
    }
    
    // 3. Filter cards in the target column to recalculate positions correctly
    const otherCardsInTarget = updatedCards.filter(c => String(c.column_id) === String(destination.droppableId))
    const cardsInOtherColumns = updatedCards.filter(c => String(c.column_id) !== String(destination.droppableId))
    
    // 4. Sort other cards in target by their current position
    otherCardsInTarget.sort((a, b) => (a.position || 0) - (b.position || 0))
    
    // 5. Insert the moving card at the new index within the target column's list
    otherCardsInTarget.splice(destination.index, 0, updatedMovingCard)
    
    // 6. Assign new positions to all cards in the target column
    const reindexedTargetCards = otherCardsInTarget.map((card, index) => ({
      ...card,
      position: index
    }))
    
    // 7. Combine back with cards from other columns
    const finalCards = [...cardsInOtherColumns, ...reindexedTargetCards]

    setCards(finalCards)

    try {
      const response = await updateKanbanCardPosition(
        draggableId,
        destination.droppableId,
        destination.index
      )

      if (!response.success) {
        throw new Error(response.error || "Failed to update position")
      }
    } catch (err) {
      console.error("Kanban update error:", err)
      // Rollback on fail
      setCards(oldCards)
      alert("カードの移動に失敗しました。以前の状態に戻します。")
    }
  }

  // Helper to get cards for column
  const getColumnCards = (columnId) => {
    return cards
      .filter(card => String(card.column_id) === String(columnId))
      .sort((a, b) => (a.position || 0) - (b.position || 0))
  }

  // --- rendering ---
  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  )
  
  if (error) return (
    <div className="p-8 bg-red-50 border border-red-200 rounded-xl text-center">
      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
      <p className="text-red-700 font-medium">{error}</p>
      <button 
        onClick={fetchData}
        className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
      >
        再読み込み
      </button>
    </div>
  )

  return (
    <div className="flex gap-6 p-6 overflow-x-auto min-h-[calc(100vh-200px)] items-start">
      <DragDropContext onDragEnd={onDragEnd}>
        {columns.map(column => (
          <div key={column.id} className="flex-shrink-0 w-80 flex flex-col bg-slate-100/50 rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
            <div className="p-4 flex items-center justify-between border-b border-slate-200 bg-white">
              <h3 className="font-bold text-slate-800 flex items-center">
                <span className="w-2 h-2 rounded-full bg-indigo-500 mr-2"></span>
                {column.name}
              </h3>
              <span className="bg-slate-100 text-slate-500 text-xs px-2.5 py-1 rounded-full font-bold">
                {getColumnCards(column.id).length}
              </span>
            </div>

            <Droppable droppableId={String(column.id)}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 p-3 space-y-3 min-h-[150px] transition-colors duration-200 ${
                    snapshot.isDraggingOver ? 'bg-indigo-50/50' : ''
                  }`}
                >
                  {getColumnCards(column.id).map((card, index) => (
                    <Draggable key={card.id} draggableId={String(card.id)} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`
                            bg-white p-4 rounded-xl border border-slate-200 shadow-sm 
                            hover:border-indigo-300 hover:shadow-md transition-all group relative
                            ${snapshot.isDragging ? 'shadow-2xl border-indigo-500 ring-4 ring-indigo-500/10 z-50 scale-105' : ''}
                          `}
                          style={{
                            ...provided.draggableProps.style,
                          }}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded shadow-sm uppercase tracking-widest ${
                              card.priority === 'high' ? 'bg-red-500 text-white' :
                              card.priority === 'medium' ? 'bg-amber-400 text-white' :
                              'bg-emerald-500 text-white'
                            }`}>
                              {card.priority === 'high' ? '高' : card.priority === 'medium' ? '中' : '低'}
                            </span>
                            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          <h4 className="text-sm font-bold text-slate-800 mb-2 leading-relaxed">
                            {card.title}
                          </h4>
                          
                          {card.description && (
                            <p className="text-xs text-slate-500 line-clamp-3 mb-4 bg-slate-50 p-2 rounded-lg border border-slate-100">
                              {card.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
                            <div className={`flex items-center text-[10px] font-bold ${
                              card.deadline && new Date(card.deadline) < new Date() ? 'text-red-500' : 'text-slate-400'
                            }`}>
                              <Clock className="w-3.5 h-3.5 mr-1.5" />
                              {card.deadline ? new Date(card.deadline).toLocaleDateString('ja-JP') : '期限なし'}
                            </div>
                            <div className="flex -space-x-1.5">
                              <div className="w-6 h-6 rounded-full bg-indigo-600 border-2 border-white shadow-sm flex items-center justify-center text-[9px] font-black text-white">
                                {card.student_name ? card.student_name.substring(0, 2) : '??'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
            
            {column.name === 'TODO' && (
              <div className="p-3 bg-white border-t border-slate-100">
                <button className="w-full py-2 px-4 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-xs flex items-center justify-center hover:bg-indigo-100 transition-colors border border-dashed border-indigo-200">
                   <Plus className="w-4 h-4 mr-1.5" /> カードを追加
                </button>
              </div>
            )}
          </div>
        ))}
      </DragDropContext>
    </div>
  )
}
