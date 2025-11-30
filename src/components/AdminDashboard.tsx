import React, { useState, useEffect, useCallback } from 'react';
import { Container, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Modal, Box, TextField, Alert, Card, CardContent, CircularProgress } from '@mui/material';
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

interface Log {
  _id: string;
  timestamp: string;
  action: string;
  performedBy: { name: string; role: string };
}

interface OrderDetails {
  order: Order;
  stageDurations: Record<string, number>;
  logs: Log[];
}

interface Buyer {
  _id: string;
  name: string;
  email: string;
}

interface Seller {
  _id: string;
  name: string;
  email: string;
}

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [associateModal, setAssociateModal] = useState(false);
  const [associateSellerModal, setAssociateSellerModal] = useState(false);
  const [detailsModal, setDetailsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [buyerId, setBuyerId] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [error, setError] = useState('');
  const [details, setDetails] = useState<OrderDetails | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingBuyers, setLoadingBuyers] = useState(false);
  const [loadingSellers, setLoadingSellers] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchStats();
    const handleOrderUpdate = (updatedOrder: Order) => {
      setOrders(prev => {
        const existingIndex = prev.findIndex(order => order._id === updatedOrder._id);
        if (existingIndex >= 0) {
          // Update existing order
          const newOrders = [...prev];
          newOrders[existingIndex] = updatedOrder;
          return newOrders;
        } else {
          // Add new order
          return [...prev, updatedOrder];
        }
      });
      fetchStats();
    };
    socket.on('adminOrderUpdate', handleOrderUpdate);
    return () => {
      socket.off('adminOrderUpdate', handleOrderUpdate);
    };
  }, []);

  useEffect(() => {
    if (associateModal) {
      fetchBuyers();
    }
  }, [associateModal]);

  useEffect(() => {
    if (associateSellerModal) {
      fetchSellers();
    }
  }, [associateSellerModal]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoadingOrders(true);
      const response = await api.get('/admin/orders');
      setOrders(response.data.orders);
      setError('');
    } catch (err) {
      console.error('Failed to fetch orders', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const response = await api.get('/admin/stats');
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats', err);
      setError('Failed to load stats. Please try again.');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchBuyers = useCallback(async () => {
    try {
      setLoadingBuyers(true);
      const response = await api.get('/admin/buyers');
      setBuyers(response.data.buyers);
    } catch (err) {
      console.error('Failed to fetch buyers', err);
      setError('Failed to load buyers. Please try again.');
    } finally {
      setLoadingBuyers(false);
    }
  }, []);

  const fetchSellers = useCallback(async () => {
    try {
      setLoadingSellers(true);
      const response = await api.get('/admin/sellers');
      setSellers(response.data.sellers);
    } catch (err) {
      console.error('Failed to fetch sellers', err);
      setError('Failed to load sellers. Please try again.');
    } finally {
      setLoadingSellers(false);
    }
  }, []);

  const handleAssociateBuyer = async () => {
    if (!selectedOrder) return;
    try {
      await api.put(`/admin/orders/${selectedOrder._id}/associate-buyer`, { buyerId });
      setAssociateModal(false);
      setBuyerId('');
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to associate buyer');
    }
  };

  const handleAssociateSeller = async () => {
    if (!selectedOrder) return;
    try {
      await api.put(`/admin/orders/${selectedOrder._id}/associate-seller`, { sellerId });
      setAssociateSellerModal(false);
      setSellerId('');
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to associate seller');
    }
  };

  const handleViewDetails = async (order: Order) => {
    try {
      const response = await api.get(`/admin/orders/${order._id}/details`);
      setDetails(response.data);
      setSelectedOrder(order);
      setDetailsModal(true);
    } catch (err) {
      console.error('Failed to fetch details', err);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Admin Dashboard
        </Typography>
        <Button variant="outlined" color="secondary" onClick={logout}>
          Logout
        </Button>
      </Box>

      {loadingStats ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <CircularProgress />
        </Box>
      ) : stats ? (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid sx={{ mb: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6">Total Orders</Typography>
                <Typography variant="h4">{stats.totalOrders}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid sx={{ mb: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6">Avg Delivery Time</Typography>
                <Typography variant="h4">{stats.avgDeliveryTime ? `${Math.round(stats.avgDeliveryTime / (1000 * 60 * 60))}h` : 'N/A'}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid sx={{ mb: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6">Orders by Stage</Typography>
                {stats.ordersByStage.map(stage => (
                  <Typography key={stage._id}>{stage._id}: {stage.count}</Typography>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : null}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loadingOrders ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
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
              {orders.map((order) => (
                <TableRow key={order._id}>
                  <TableCell>{order.orderId}</TableCell>
                  <TableCell>{order.currentStage}</TableCell>
                  <TableCell>{order.buyer ? `${order.buyer.name} (${order.buyer.email})` : 'Not Assigned'}</TableCell>
                  <TableCell>{order.seller ? `${order.seller.name} (${order.seller.email})` : 'Not Assigned'}</TableCell>
                  <TableCell>{order.items.join(', ')}</TableCell>
                  <TableCell>{new Date(order.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{new Date(order.updatedAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => {
                        setSelectedOrder(order);
                        setBuyerId('');
                        setAssociateModal(true);
                      }}
                      sx={{ mr: 1 }}
                      disabled={order.currentStage !== 'Order Placed'}
                    >
                      Associate Buyer
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => {
                        setSelectedOrder(order);
                        setSellerId('');
                        setAssociateSellerModal(true);
                      }}
                      sx={{ mr: 1 }}
                      disabled={order.currentStage !== 'Buyer Associated'}
                    >
                      Associate Seller
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
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Associate Buyer Modal */}
      <Modal open={associateModal} onClose={() => setAssociateModal(false)}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'background.paper', p: 4 }}>
          <Typography variant="h6">Associate Buyer</Typography>
          {loadingBuyers ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <>
              <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
                Select a buyer from the list below:
              </Typography>
              {buyers.length > 0 ? (
                buyers.map((buyer) => (
                  <Button
                    key={buyer._id}
                    fullWidth
                    variant={buyerId === buyer._id ? "contained" : "outlined"}
                    onClick={() => setBuyerId(buyer._id)}
                    sx={{ mb: 1, justifyContent: 'flex-start' }}
                  >
                    {buyer.name} ({buyer.email})
                  </Button>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No buyers available.
                </Typography>
              )}
              <Box sx={{ mt: 2 }}>
                <Button
                  onClick={handleAssociateBuyer}
                  variant="contained"
                  disabled={!buyerId}
                >
                  Associate
                </Button>
                <Button onClick={() => setAssociateModal(false)} sx={{ ml: 1 }}>
                  Cancel
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Modal>

      {/* Associate Seller Modal */}
      <Modal open={associateSellerModal} onClose={() => setAssociateSellerModal(false)}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'background.paper', p: 4 }}>
          <Typography variant="h6">Associate Seller</Typography>
          {loadingSellers ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <>
              <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
                Select a seller from the list below:
              </Typography>
              {sellers.length > 0 ? (
                sellers.map((seller) => (
                  <Button
                    key={seller._id}
                    fullWidth
                    variant={sellerId === seller._id ? "contained" : "outlined"}
                    onClick={() => setSellerId(seller._id)}
                    sx={{ mb: 1, justifyContent: 'flex-start' }}
                  >
                    {seller.name} ({seller.email})
                  </Button>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No sellers available.
                </Typography>
              )}
              <Box sx={{ mt: 2 }}>
                <Button
                  onClick={handleAssociateSeller}
                  variant="contained"
                  disabled={!sellerId}
                >
                  Associate
                </Button>
                <Button onClick={() => setAssociateSellerModal(false)} sx={{ ml: 1 }}>
                  Cancel
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Modal>

      {/* View Details Modal */}
      <Modal open={detailsModal} onClose={() => setDetailsModal(false)}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, bgcolor: 'background.paper', p: 4, maxHeight: '80vh', overflow: 'auto' }}>
          <Typography variant="h6">Order Details</Typography>
          {details && (
            <>
              <Typography><strong>Order ID:</strong> {details.order.orderId}</Typography>
              <Typography><strong>Current Stage:</strong> {details.order.currentStage}</Typography>
              <Typography sx={{ mt: 2 }}><strong>Order Started:</strong> {new Date(details.order.createdAt).toLocaleString()}</Typography>
              <Typography sx={{ mt: 2 }}><strong>Time Taken Between Stages:</strong></Typography>
              {Object.keys(details.stageDurations).length > 0 ? (
                Object.entries(details.stageDurations).map(([key, value]: [string, any]) => {
                  const hours = Math.round(value / (1000 * 60 * 60) * 10) / 10; // Round to 1 decimal place
                  return (
                    <Typography key={key} sx={{ ml: 2 }}>
                      {key}: {hours} hours
                    </Typography>
                  );
                })
              ) : (
                <Typography sx={{ ml: 2 }}>No stage durations available.</Typography>
              )}
              <Typography sx={{ mt: 2 }}><strong>Action Log / Event History:</strong></Typography>
              {details.logs.length > 0 ? (
                details.logs.map((log: Log) => (
                  <Typography key={log._id} sx={{ ml: 2 }}>
                    {new Date(log.timestamp).toLocaleString()}: {log.action} by {log.performedBy.name} ({log.performedBy.role})
                  </Typography>
                ))
              ) : (
                <Typography sx={{ ml: 2 }}>No logs available.</Typography>
              )}
            </>
          )}
          <Button onClick={() => setDetailsModal(false)} sx={{ mt: 2 }}>Close</Button>
        </Box>
      </Modal>
    </Container>
  );
};

export default AdminDashboard;
