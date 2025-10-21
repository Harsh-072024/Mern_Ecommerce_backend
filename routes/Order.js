const express = require("express");
const { fetchOrderByUser, createOrder, updateOrder, deleteOrder, fetchAllOrders } = require("../controller/Order");

const router = express.Router();

router.post("/", createOrder)
      .get('/own', fetchOrderByUser)
      .patch('/:id', updateOrder)
      .delete('/:id', deleteOrder)
      .get('/', fetchAllOrders)

exports.router = router;