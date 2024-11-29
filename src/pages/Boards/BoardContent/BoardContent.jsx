import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import ListColumns from './ListColumns/ListColumns'
import { mapOrder } from '~/utils/sorts'
import { DndContext, PointerSensor, MouseSensor, TouchSensor, useSensors, useSensor, DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'

import Column from './ListColumns/Column/Column'
import Card from './ListColumns/Column/ListCards/Card/Card'

const DRAG_ACTIVE_ITEM_TYPE = {
  COLUMN: 'DRAG_ACTIVE_ITEM_TYPE_COLUMN',
  CARD: 'DRAG_ACTIVE_ITEM_TYPE_CARD'
}
function BoardContent({ board }) {
  //Nếu dùng pointerSensor thì kết hợp touchAction: 'none' , nhưng vẫn bug
  // const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 10 } })
  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 10 } })
  //Ấn giữ 250ms, dung sai cảm ứng 5px
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 250, torelance: 500 } })
  //ưu tiên sử dụng mouse và touch sensor để trải nghiệm trên mobile tốt nhất
  const mySensors = useSensors(mouseSensor, touchSensor)

  const [orderredColumns, setOrderredColumns] = useState([])

  const [activeDragItemId, setActiveDragItemId] = useState(null)
  const [activeDragItemType, setActiveDragItemType] = useState(null)
  const [activeDragItemData, setActiveDragItemData] = useState(null)


  useEffect(() => {
    setOrderredColumns(mapOrder(board?.columns, board?.columnOrderIds, '_id' ))
  }, [board])


  //Trigger: Khi bắt đầu kéo một phần tử Drag
  const handleDragStart = (event) => {
    console.log('dragStart', event)
    setActiveDragItemId(event?.active?.id)
    setActiveDragItemType(event?.active?.data?.current?.columnId ? DRAG_ACTIVE_ITEM_TYPE.CARD : DRAG_ACTIVE_ITEM_TYPE.COLUMN)
    setActiveDragItemData(event?.active?.data?.current )
  }
  //Trigger: Khi kết thúc hành động thả phần tử Drop
  const handleDragEnd = (event) => {
    console.log('dragEnd', event)
    const { active, over } = event
    if (!over) return

    if (active.id !== over.id) {
      const oldIndex = orderredColumns.findIndex(c => c._id === active.id)
      const newIndex = orderredColumns.findIndex(c => c._id === over.id)
      const dndOrderredColumns = arrayMove(orderredColumns, oldIndex, newIndex)
      //for call API
      // const dndOrderredColumnsIds = dndOrderredColumns.map(c => c._id)
      // console.log('dndOrderredColumns: ', dndOrderredColumns)
      // console.log('dndOrderredColumnsIds: ', dndOrderredColumnsIds)
      setOrderredColumns(dndOrderredColumns)
    }
    setActiveDragItemId(null)
    setActiveDragItemType(null)
    setActiveDragItemData(null)
  }
  console.log('activeDragItemId', activeDragItemId)
  console.log('activeDragItemType', activeDragItemType)
  console.log('activeDragItemData', activeDragItemData)

  const customDropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: { active: { opacity: '0.5'}}})
  }

  return (
    <DndContext
      sensors = { mySensors }
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Box sx={{
        bgcolor: (theme) => ( theme.palette.mode === 'dark' ? '#34495e' : '#1976d2'),
        width: '100%',
        height: (theme) => theme.trello.boardContentHeight,
        p: '10px 0'
      }}>
        <ListColumns columns ={ orderredColumns }/>
        <DragOverlay dropAnimation={customDropAnimation}>
          {!activeDragItemType && null}
          {(activeDragItemId && activeDragItemType === DRAG_ACTIVE_ITEM_TYPE.COLUMN) && <Column column={activeDragItemData}/>}
          {(activeDragItemId && activeDragItemType === DRAG_ACTIVE_ITEM_TYPE.COLUMN) && <Card card={activeDragItemData}/>}

        </DragOverlay>
      </Box>
    </DndContext>
  )
}

export default BoardContent