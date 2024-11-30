import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import ListColumns from './ListColumns/ListColumns'
import { mapOrder } from '~/utils/sorts'
import { DndContext, PointerSensor, MouseSensor, TouchSensor, useSensors, useSensor, DragOverlay, defaultDropAnimationSideEffects, closestCorners } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { cloneDeep } from 'lodash'

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
  const [oldColumnWhenDraggingCard, setOldColumnWhenDraggingCard] = useState(null)


  useEffect(() => {
    setOrderredColumns(mapOrder(board?.columns, board?.columnOrderIds, '_id' ))
  }, [board])

  const findColumnByCardId = (cardId) => {
    return orderredColumns.find(column => column?.cards?.map(card => card._id)?.includes(cardId))
  }

  //Funcion dùng chung xử lý cập nhật lại các state trong th di chuyển card giữa các column
  const moveCardBetweenDifferentColumns = (
    overColumn,
    overCardId,
    active,
    over,
    activeColumn,
    activeDraggingCardId,
    activeDraggingCardData
  ) => {
    setOrderredColumns(prevColumns => {
      //Tìm vị trí index của overCard trong column đích ( nơi activeCard sẽ được thả)
      const overCardIndex = overColumn?.cards?.findIndex(card => card._id === overCardId)


      //Logic tính vị trí cardIndex mới (trên hay dưới overCard) lấy ra tương tự thư viên - từ chối hiểu
      let newCardIndex
      const isBelowOverItem = active.rect.current.translated &&
        active.rect.current.translated.top > over.rect.top + over.rect.height

      const modifier = isBelowOverItem ? 1 : 0

      newCardIndex = overCardIndex >= 0 ? overCardIndex + modifier : overColumn?.cards?.length + 1
      // console.log('newCardIndex', newCardIndex)
      // console.log('isBelowOverItem', isBelowOverItem)
      // console.log('modifier', modifier)

      //Cloned OderredColumnsState cũ thành cái mới để xử lý data rồi return - cập nhât OderredColumnsState mới
      const nextColumns = cloneDeep(prevColumns)
      const nextActiveColumns = nextColumns.find(column => column._id === activeColumn._id)
      const nextOverColumns = nextColumns.find(column => column._id === overColumn._id)

      //column cũ
      if (nextActiveColumns) {
        //Cập nhât: xóa card ở column cũ ( column active)
        nextActiveColumns.cards = nextActiveColumns.cards.filter(card => card._id !== activeDraggingCardId)
        //Cập nhât lại mảng cardOrderIds cho chuẩn dữ liệu
        nextActiveColumns.cardOrderIds = nextActiveColumns.cards.map(card => card._id)
      }

      //column mới
      if (nextOverColumns ) {
        //Kiểm ra Card đang kéo đã tồn tại ở overColumn hay chưa , nếu đã tồn tại thì cần xóa nó trước
        nextOverColumns.cards = nextOverColumns.cards.filter(card => card._id !== activeDraggingCardId)

        //Phải cập nhật lại chuẩn dữ liệu columnId trong card sau khi kéo card giữa hai column khác nhau
        const rebuild_activeDraggingCardData = {
          ...activeDraggingCardData,
          columnId: nextOverColumns._id
        }
        //Thêm cái card đang kéo vào overColumn theo vị trí index mới
        nextOverColumns.cards = nextOverColumns.cards.toSpliced(newCardIndex, 0, rebuild_activeDraggingCardData )
        nextOverColumns.cardOrderIds = nextOverColumns.cards.map(card => card._id)

      }
      // console.log('nextColumns', nextColumns)
      return nextColumns
    })
  }
  //Trigger: Khi bắt đầu kéo một phần tử Drag
  const handleDragStart = (event) => {
    // console.log('dragStart', event)
    setActiveDragItemId(event?.active?.id)
    setActiveDragItemType(event?.active?.data?.current?.columnId ? DRAG_ACTIVE_ITEM_TYPE.CARD : DRAG_ACTIVE_ITEM_TYPE.COLUMN)
    setActiveDragItemData(event?.active?.data?.current )

    //Nếu là kéo card thì mới thực hiện hành động set OldColumn
    if (event?.active?.data?.current?.columnId ) {
      setOldColumnWhenDraggingCard(findColumnByCardId(event?.active?.id))
    }
  }
  //Trigger: Trong quá trình kéo phần tử
  const handleDragOver = (event) => {
    // nếu kéo column => do nothing
    if (activeDragItemType === DRAG_ACTIVE_ITEM_TYPE.COLUMN) { return }
    // console.log('dragOver', event)
    const { active, over } = event
    //Nếu kéo ra ngoài phạm vi container ( không tồn tại active hay over) => không làm gì
    if (!active || !over) return

    //card đang được kéo
    const { id: activeDraggingCardId, data: { current: activeDraggingCardData } } = active
    //card đang tương tác trên/ dưới so với cái card đang được kéo
    const { id: overCardId } = over
    //Tìm 2 column theo id
    const activeColumn = findColumnByCardId(activeDraggingCardId)
    const overColumn = findColumnByCardId(overCardId)


    if ( !activeColumn || !overColumn) return

    //Xử lý logic khi kéo thả qua hai column khác nhau, nếu card trong chính column của nó thì không làm gì
    //Đây chỉ là xử lý lúc onDragOver , còn lúc xử lý hoàn thiện thì lại là vấn đề khác (onDragEnd)
    if (activeColumn._id !== overColumn._id) {
      moveCardBetweenDifferentColumns(
        overColumn,
        overCardId,
        active,
        over,
        activeColumn,
        activeDraggingCardId,
        activeDraggingCardData
      )
    }
  }
  //Trigger: Khi kết thúc hành động thả phần tử Drop
  const handleDragEnd = (event) => {
    // console.log('dragEnd', event)
    const { active, over } = event
    if (!active || !over) return

    //Xử lý kéo thả cards
    if (activeDragItemType === DRAG_ACTIVE_ITEM_TYPE.CARD) {
      //card đang được kéo
      const { id: activeDraggingCardId, data: { current: activeDraggingCardData } } = active
      //card đang tương tác trên/ dưới so với cái card đang được kéo
      const { id: overCardId } = over
      //Tìm 2 column theo id
      const activeColumn = findColumnByCardId(activeDraggingCardId)
      const overColumn = findColumnByCardId(overCardId)


      if ( !activeColumn || !overColumn) return

      //Hành động kéo thả card giữa hai column khác nhau
      //Phải dùng tới activeDragItemData.columnId hoặc oldColumnWhenDraggingCard._id chứ không dùng được activeData vì
      //khi đi qua onDragOver state đã bị cập nhật
      if (oldColumnWhenDraggingCard._id !== overColumn._id) {
        // Hành động kéo thả card giữa hai column khác nhau
        moveCardBetweenDifferentColumns(
          overColumn,
          overCardId,
          active,
          over,
          activeColumn,
          activeDraggingCardId,
          activeDraggingCardData
        )
      }
      else {
        //Hành động kéo thả card trong cùng column

        //Lấy vị trí cũ từ oldColumnWhenDraggingCard
        const oldCardIndex = oldColumnWhenDraggingCard?.cards?.findIndex(c => c._id === activeDragItemId)

        //Lấy vị trí mới
        const newCardIndex = overColumn?.cards?.findIndex(c => c._id === overCardId.id)

        const dndOrderredCard = arrayMove(oldColumnWhenDraggingCard?.cards, oldCardIndex, newCardIndex)

        setOrderredColumns(prevColumns => {
          //Cloned OderredColumnsState cũ thành cái mới để xử lý data rồi return - cập nhât OderredColumnsState mới
          const nextColumns = cloneDeep(prevColumns)

          //Tìm tới column mà chúng ta đang thả
          const targetColumn = nextColumns.find(column => column._id === overColumn._id)

          //Cập nhật lại 2 giá trị mới là card và cardOverIds trong cái targetColumn
          targetColumn.cards = dndOrderredCard
          targetColumn.cardOrderIds = dndOrderredCard.map(card => card._id)

          //Trả về giá trị state mới chuẩn vị trí
          return nextColumns
        })

      }
    }

    //Xử lý kéo thả column trong BoardContent
    if (activeDragItemType === DRAG_ACTIVE_ITEM_TYPE.COLUMN) {
      if (active.id !== over.id) {
        const oldColumnIndex = orderredColumns.findIndex(c => c._id === active.id)
        const newColumnIndex = orderredColumns.findIndex(c => c._id === over.id)
        const dndOrderredColumns = arrayMove(orderredColumns, oldColumnIndex, newColumnIndex)
        //for call API
        // const dndOrderredColumnsIds = dndOrderredColumns.map(c => c._id)
        // console.log('dndOrderredColumns: ', dndOrderredColumns)
        // console.log('dndOrderredColumnsIds: ', dndOrderredColumnsIds)
        setOrderredColumns(dndOrderredColumns)
      }
    }

    //Những dữ liệu sau khi kéo thả luôn phải đưa về giá trị null mặc định ban đầu
    setActiveDragItemId(null)
    setActiveDragItemType(null)
    setActiveDragItemData(null)
    setOldColumnWhenDraggingCard(null)
  }
  // console.log('activeDragItemId', activeDragItemId)
  // console.log('activeDragItemType', activeDragItemType)
  // console.log('activeDragItemData', activeDragItemData)

  const customDropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: { active: { opacity: '0.5' } } })
  }

  return (
    <DndContext
      sensors = { mySensors }
      //Thuật toán phát hiện va chạm khi card với cover lớn không kéo qua column được )
      collisionDetection = { closestCorners }
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
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
          {(activeDragItemId && activeDragItemType === DRAG_ACTIVE_ITEM_TYPE.CARD ) && <Card card={activeDragItemData}/>}

        </DragOverlay>
      </Box>
    </DndContext>
  )
}

export default BoardContent