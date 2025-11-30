// src/components/AdminDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Modal,
  Box,
  Alert,
  Card,
  CardContent
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import socket from '../services/socket';

interface Order {
  _id: string;
  orderId: string;
  items: string[];
  buyer?: { name: string; email: string };
  seller?: { name: string; email: string };
  currentStage: string;
  createdAt: string;
  updatedAt: string;
}

interface StageCount {
  _id: string;
  count: number;
}

interface Stats {
  totalOrders: number;
  ordersByStage: StageCount[];
  avgDeliveryTime: number;
}

const AdminDashboard: React.FC = () => {
  // removed unused `user` to avoid lint warning
  useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [associateModal, setAssociateModal] = useState(false);
  const [detailsModal, setDetailsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [buyerId, setBuyerId] = useState('');
  const [error, setError] = useState('');
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // wrap fetches in useCallback and include them in useEffect deps
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/orders');
      setOrders(response.data.orders || []);
    } catch (err) {
      console.error('Failed to fetch orders', err);
      setError('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/admin/stats');
      setStats(response.data || null);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchStats();

    const handler = (updatedOrder: Order) => {
      setOrders(prev => {
        const found = prev.some(o => o._id === updatedOrder._id);
        if (found) return prev.map(o => o._id === updatedOrder._id ? updatedOrder : o);
        return [updatedOrder, ...prev];
      });
      fetchStats();
    };

    if (socket && socket.on) socket.on('adminOrderUpdate', handler);
    return () => {
      if (socket && socket.off) socket.off('adminOrderUpdate', handler);
    };
  }, [fetchOrders, fetchStats]);

  const handleAssociateBuyer = async () => {
    if (!selectedOrder) return;
    if (!buyerId) {
      setError('Please enter a Buyer ID');
      return;
    }
    try {
      await api.put(`/admin/orders/${selectedOrder._id}/associate-buyer`, { buyerId });
      setAssociateModal(false);
      setBuyerId('');
      setError('');
      fetchOrders();
      fetchStats();
    } catch (err: any) {
      console.error('Associate buyer failed:', err);
      setError(err?.response?.data?.message || 'Failed to associate buyer');
    }
  };

  const handleViewDetails = async (order: Order) => {
    try {
      const response = await api.get(`/admin/orders/${order._id}/details`);
      setDetails(response.data || null);
      setSelectedOrder(order);
      setDetailsModal(true);
    } catch (err) {
      console.error('Failed to fetch details', err);
      setError('Failed to fetch order details');
    }
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        Admin Dashboard
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {stats && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6">Total Orders</Typography>
                <Typography variant="h4">{stats.totalOrders}</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6">Avg Delivery Time</Typography>
                <Typography variant="h4">
                  {stats.avgDeliveryTime ? `${Math.round(stats.avgDeliveryTime / (1000 * 60 * 60))}h` : 'N/A'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6">Orders by Stage</Typography>
                {(stats.ordersByStage || []).map(stage => (
                  <Typography key={stage._id}>{stage._id}: {stage.count}</Typography>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order ID</TableCell>
              <TableCell>Current Stage</TableCell>
              <TableCell>Buyer</TableCell>
              <TableCell>Seller</TableCell>
              <TableCell>Items</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Last Updated</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {(orders || []).map((order) => (
              <TableRow key={order._id}>
                <TableCell>{order.orderId}</TableCell>
                <TableCell>{order.currentStage}</TableCell>
                <TableCell>{order.buyer ? `${order.buyer.name} (${order.buyer.email})` : 'Not Assigned'}</TableCell>
                <TableCell>{order.seller ? `${order.seller.name} (${order.seller.email})` : 'Not Assigned'}</TableCell>
                <TableCell>{Array.isArray(order.items) ? order.items.join(', ') : ''}</TableCell>
                <TableCell>{order.createdAt ? new Date(order.createdAt).toLocaleString() : '—'}</TableCell>
                <TableCell>{order.updatedAt ? new Date(order.updatedAt).toLocaleString() : '—'}</TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => {
                      setSelectedOrder(order);
                      setAssociateModal(true);
                      setError('');
                    }}
                    sx={{ mr: 1 }}
                  >
                    Associate Buyer
                  </Button>

                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => handleViewDetails(order)}
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  {loading ? 'Loading orders...' : 'No orders found.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Modal open={associateModal} onClose={() => { setAssociateModal(false); setSelectedOrder(null); }}>
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)', width: 400,
          bgcolor: 'background.paper', p: 4
        }}>
          <Typography variant="h6">Associate Buyer</Typography>

          <Box sx={{ mt: 2 }}>
            <input
              style={{ width: '100%', padding: 8 }}
              placeholder="Buyer ID"
              value={buyerId}
              onChange={(e) => setBuyerId(e.target.value)}
            />
          </Box>

          <Box sx={{ mt: 2 }}>
            <Button onClick={handleAssociateBuyer} variant="contained">Associate</Button>
            <Button onClick={() => { setAssociateModal(false); setSelectedOrder(null); }} sx={{ ml: 1 }}>Cancel</Button>
          </Box>
        </Box>
      </Modal>

      <Modal open={detailsModal} onClose={() => { setDetailsModal(false); setSelectedOrder(null); }}>
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)', width: 600,
          bgcolor: 'background.paper', p: 4, maxHeight: '80vh', overflow: 'auto'
        }}>
          <Typography variant="h6">Order Details</Typography>

          {details ? (
            <>
              <Typography>Order ID: {details.order?.orderId || '—'}</Typography>
              <Typography>Current Stage: {details.order?.currentStage || '—'}</Typography>

              <Typography sx={{ mt: 2 }}>Stage Durations:</Typography>
              {details.stageDurations && Object.keys(details.stageDurations).length > 0 ? (
                Object.entries(details.stageDurations).map(([key, value]) => (
                  <Typography key={key}>{key}: {Math.round((value as number) / (1000 * 60))} minutes</Typography>
                ))
              ) : <Typography>No stage duration data</Typography>}

              <Typography sx={{ mt: 2 }}>Action Logs:</Typography>
              {Array.isArray(details.logs) && details.logs.length > 0 ? (
                details.logs.map((log: any) => (
                  <Typography key={log._id || `${log.timestamp}-${log.action}`}>
                    {new Date(log.timestamp).toLocaleString()}: {log.action} by {log.performedBy?.name || 'Unknown'} ({log.performedBy?.role || '—'})
                  </Typography>
                ))
              ) : <Typography>No logs available</Typography>}
            </>
          ) : (
            <Typography>Loading details...</Typography>
          )}

          <Button onClick={() => { setDetailsModal(false); setSelectedOrder(null); }} sx={{ mt: 2 }}>Close</Button>
        </Box>
      </Modal>
    </Container>
  );
};

export default AdminDashboard;
