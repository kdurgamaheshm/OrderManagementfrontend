import React, { useState, useEffect } from 'react';
import { Container, Typography, Button, Box, LinearProgress, Modal, TextField, Alert, Card, CardContent } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import socket from '../services/socket';

interface Order {
  _id: string;
  orderId: string;
  items: string[];
  buyer?: string;
  currentStage: string;
  stageTimestamps: Record<string, string>;
  createdAt: string;
}

const stages = ['Order Placed', 'Buyer Associated', 'Processing', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];

const BuyerDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<string[]>(['']);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrder();
    socket.on('orderUpdate', (updatedOrder: Order) => {
      if (updatedOrder.buyer === user?.id) {
        setOrder(updatedOrder);
      }
    });
    return () => {
      socket.off('orderUpdate');
    };
  }, [user]);

  const fetchOrder = async () => {
    try {
      const response = await api.get('/orders/buyer');
      setOrder(response.data.order);
    } catch (err) {
      console.error('Failed to fetch order', err);
    }
  };

  const handleCreateOrder = async () => {
    try {
      const filteredItems = items.filter(item => item.trim() !== '');
      if (filteredItems.length === 0) {
        setError('Please add at least one item');
        return;
      }
      await api.post('/orders', { items: filteredItems });
      setOpen(false);
      setItems(['']);
      setError('');
      fetchOrder();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create order');
    }
  };

  const addItem = () => {
    setItems([...items, '']);
  };

  const updateItem = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const getProgress = () => {
    if (!order) return 0;
    const currentIndex = stages.indexOf(order.currentStage);
    return ((currentIndex + 1) / stages.length) * 100;
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Buyer Dashboard
        </Typography>
        <Button variant="outlined" color="secondary" onClick={logout}>
          Logout
        </Button>
      </Box>
      {!order ? (
        <Box>
          <Typography variant="h6">No active order</Typography>
          <Button variant="contained" onClick={() => setOpen(true)}>
            Create New Order
          </Button>
        </Box>
      ) : (
        <Card>
          <CardContent>
            <Typography variant="h6">Order ID: {order.orderId}</Typography>
            <Typography>Items: {order.items.join(', ')}</Typography>
            <Typography>Current Stage: {order.currentStage}</Typography>
            <Box sx={{ mt: 2 }}>
              <Typography>Progress:</Typography>
              <LinearProgress variant="determinate" value={getProgress()} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                {stages.map((stage, index) => (
                  <Typography key={stage} variant="caption" color={index <= stages.indexOf(order.currentStage) ? 'primary' : 'textSecondary'}>
                    {stage}
                  </Typography>
                ))}
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'background.paper', p: 4 }}>
          <Typography variant="h6" component="h2">
            Create New Order
          </Typography>
          {items.map((item, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <TextField
                fullWidth
                label={`Item ${index + 1}`}
                value={item}
                onChange={(e) => updateItem(index, e.target.value)}
              />
              {items.length > 1 && (
                <Button onClick={() => removeItem(index)}>Remove</Button>
              )}
            </Box>
          ))}
          <Button onClick={addItem} sx={{ mt: 1 }}>Add Item</Button>
          {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
          <Box sx={{ mt: 2 }}>
            <Button onClick={handleCreateOrder} variant="contained">Submit Order</Button>
            <Button onClick={() => setOpen(false)} sx={{ ml: 1 }}>Cancel</Button>
          </Box>
        </Box>
      </Modal>
    </Container>
  );
};

export default BuyerDashboard;
