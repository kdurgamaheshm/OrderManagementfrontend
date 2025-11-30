import React, { useState, useEffect } from 'react';
import { Container, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Alert, Box } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import socket from '../services/socket';

interface Order {
  _id: string;
  orderId: string;
  items: string[];
  buyer: { name: string; email: string };
  seller?: string;
  currentStage: string;
  createdAt: string;
  updatedAt: string;
}

const stages = ['Order Placed', 'Buyer Associated', 'Processing', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];

const SellerDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrders();
    socket.on('orderUpdate', (updatedOrder: Order) => {
      if (updatedOrder.seller === user?.id) {
        setOrders(prev => prev.map(order => order._id === updatedOrder._id ? updatedOrder : order));
      }
    });
    return () => {
      socket.off('orderUpdate');
    };
  }, [user]);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders/seller');
      setOrders(response.data.orders);
    } catch (err) {
      console.error('Failed to fetch orders', err);
    }
  };

  const handleNextStage = async (orderId: string) => {
    try {
      await api.put(`/orders/${orderId}/next-stage`);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update stage');
    }
  };

  const handleDelete = async (orderId: string) => {
    try {
      await api.delete(`/orders/${orderId}`);
      setOrders(prev => prev.filter(order => order._id !== orderId));
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete order');
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Seller Dashboard
        </Typography>
        <Button variant="outlined" color="secondary" onClick={logout}>
          Logout
        </Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order ID</TableCell>
              <TableCell>Current Stage</TableCell>
              <TableCell>Items</TableCell>
              <TableCell>Buyer Name</TableCell>
              <TableCell>Buyer Email</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Updated At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order._id}>
                <TableCell>{order.orderId}</TableCell>
                <TableCell>{order.currentStage}</TableCell>
                <TableCell>{order.items.join(', ')}</TableCell>
                <TableCell>{order.buyer?.name || 'N/A'}</TableCell>
                <TableCell>{order.buyer?.email || 'N/A'}</TableCell>
                <TableCell>{new Date(order.createdAt).toLocaleString()}</TableCell>
                <TableCell>{new Date(order.updatedAt).toLocaleString()}</TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleNextStage(order._id)}
                    disabled={order.currentStage === 'Delivered'}
                    sx={{ mr: 1 }}
                  >
                    Next Stage
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => handleDelete(order._id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default SellerDashboard;
