import Container from '@mui/material/Container'
import AppBar from '~/components/AppBar/AppBar'
import BoardBar from '~/pages/Boards/BoardBar/BoardBar'
import BoardContent from '~/pages/Boards/BoardContent/BoardContent'
// import { mockData } from '~/apis/mock-data'
import { useEffect, useState } from 'react'
import { fetchBoardDetailsAPI, createNewColumnAPI, createNewCardAPI, updateBoardDetailsAPI, updateColumnDetailsAPI, moveCardToDifferentColumnAPI, deleteColumnDetailsAPI } from '~/apis'
import { generatePlaceholderCard } from '~/utils/formatters'
import { isEmpty } from 'lodash'
import { mapOrder } from '~/utils/sorts'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import { toast } from 'react-toastify'


function Board() {

  const [board, setBoard] = useState(null)
  useEffect(() => {
    const boardId = '675898471b15ba1c8e04b5eb'

    fetchBoardDetailsAPI(boardId).then(board => {

      board.columns = mapOrder(board.columns, board.columnOrderIds, '_id')

      board.columns.forEach(column => {
        if (isEmpty(column.cards)) {
          column.cards = [generatePlaceholderCard(column)]
          column.cardOrderIds = [generatePlaceholderCard(column)._id]
        } else {
          column.cards = mapOrder(column.cards, column.cardOrderIds, '_id')
        }
      })
      setBoard(board)
    })

  }, [])
  //Func nay goi API tao moi column va cap nhat board state
  const createNewColumn = async (newColumnData) => {
    const createdColumn = await createNewColumnAPI({
      ...newColumnData,
      boardId: board._id
    })

    createdColumn.cards = [generatePlaceholderCard(createdColumn)]
    createdColumn.cardOrderIds = [generatePlaceholderCard(createdColumn)._id]
    //Cap nhat lai state Board
    const newBoard = { ...board }
    newBoard.columns.push(createdColumn)
    newBoard.columnOrderIds.push(createdColumn._id)
    setBoard(newBoard)
  }

  //Func nay goi API tao moi column va cap nhat board state
  const createNewCard = async (newCardData) => {
    const createdCard = await createNewCardAPI({
      ...newCardData,
      boardId: board._id
    })
    //Cap nhat lai state Board
    const newBoard = { ...board }
    const columnToUpdate = newBoard.columns.find(column => column._id === createdCard.columnId)
    if (columnToUpdate) {
      if (columnToUpdate.cards.some(card => card.FE_PlaceholderCard)) {
        columnToUpdate.cards = [createdCard]
        columnToUpdate.cardOrderIds = [createdCard._id]
      } else {
        columnToUpdate.cards.push(createdCard)
        columnToUpdate.cardOrderIds.push(createdCard._id)
      }
    }
    setBoard(newBoard)
  }

  //Func goi API va xu ly keo tha Column xong xuoi
  const moveColumns = (dndOrderredColumns) => {
    const dndOrderredColumnsIds = dndOrderredColumns.map(c => c._id)

    //Cap nhat lai state Board
    const newBoard = { ...board }
    newBoard.columns = dndOrderredColumns
    newBoard.columnOrderIds = dndOrderredColumnsIds
    setBoard(newBoard)

    //Goi API Update board
    updateBoardDetailsAPI(newBoard._id, { columnOrderIds: dndOrderredColumnsIds })
  }

  const moveCardInTheSameColumn = (dndOrderredCard, dndOrderredCardIds, columnId) => {
    //Cap nhat lai state Board
    const newBoard = { ...board }
    const columnToUpdate = newBoard.columns.find(column => column._id === columnId)
    if (columnToUpdate) {
      columnToUpdate.cards = dndOrderredCard
      columnToUpdate.cardOrderIds = dndOrderredCardIds
    }
    setBoard(newBoard)
    //Goi API Update column
    updateColumnDetailsAPI(columnId, { cardOrderIds: dndOrderredCardIds })

  }

  const moveCardToDifferentColumn = (currentCardId, prevColumnId, nextColumnId, dndOrderredColumns) => {
    const dndOrderredColumnsIds = dndOrderredColumns.map(c => c._id)

    //Cap nhat lai state Board
    const newBoard = { ...board }
    newBoard.columns = dndOrderredColumns
    newBoard.columnOrderIds = dndOrderredColumnsIds
    setBoard(newBoard)

    //Goi api xu ly BE
    let prevCardOrderIds = dndOrderredColumns.find(c => c._id === prevColumnId)?.cardOrderIds
    if (prevCardOrderIds[0].includes('placeholder-card')) prevCardOrderIds = []
    moveCardToDifferentColumnAPI({
      currentCardId,
      prevColumnId,
      prevCardOrderIds,
      nextColumnId,
      nextCardOrderIds: dndOrderredColumns.find(c => c._id === nextColumnId)?.cardOrderIds
    })

  }

  //Xu ly xoa Column va Cards ben trong no
  const deleteColumnDetails = (columnId) => {
    //Update cho chuan du lieu state Board
    //Cap nhat lai state Board
    const newBoard = { ...board }
    newBoard.columns = newBoard.columns.filter(c => c._id !== columnId)
    newBoard.columnOrderIds = newBoard.columnOrderIds.filter(_id => _id !== columnId)
    setBoard(newBoard)
    //Goi API xu ly BE
    deleteColumnDetailsAPI(columnId).then(res => {
      toast.success(res?.deleteResult)
    })
  }

  if (!board) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, width: '100vw', height: '100vh' }}>
        <CircularProgress />
        <Typography>Loading Board...</Typography>
      </Box>
    )
  }

  return (
    <Container disableGutters maxWidth={false} sx={{ height: '100vh' }}>
      <AppBar/>
      <BoardBar board={board}/>
      <BoardContent
        board={board}
        createNewColumn={createNewColumn}
        createNewCard={createNewCard}
        moveColumns={moveColumns}
        moveCardInTheSameColumn={moveCardInTheSameColumn}
        moveCardToDifferentColumn={moveCardToDifferentColumn}
        deleteColumnDetails={deleteColumnDetails}
      />
    </Container>
  )
}

export default Board
