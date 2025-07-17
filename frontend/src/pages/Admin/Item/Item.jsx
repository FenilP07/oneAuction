import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../../components/Layout";
import { Card, Spinner } from "react-bootstrap";
import "./item.css";

import { AiOutlineShoppingCart } from "react-icons/ai";
import { FcApproval } from "react-icons/fc";
import { CgSandClock, CgClose } from "react-icons/cg";
import { FiChevronRight } from "react-icons/fi";
import useAuthStore from "../../../store/authStore";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const Item = () => {
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
  });

  const [categoryStats, setCategoryStats] = useState({
  total: 0,
  active: 0,
});

  const [loading, setLoading] = useState(true);
  const { accessToken } = useAuthStore();
  const [items, setItems] = useState([]);
  const navigate = useNavigate();

  const pieData = [
    { name: "Approved", value: stats.approved },
    { name: "Pending", value: stats.pending },
    { name: "Rejected", value: stats.rejected },
  ];

  const COLORS = ["#10B981", "#F59E0B", "#EF4444"];

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:3000/api/admin/item/pending", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        setStats(data.data.stats);
        setItems(data.data.items);
      } else {
        console.error("Error fetching stats:", data.message);
      }
    } catch (err) {
      console.error("Failed to fetch item stats", err);
    } finally {
      setLoading(false);
    }
  };const fetchCategoryStats = async () => {
  try {
    const res = await fetch("http://localhost:3000/api/category/stats", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await res.json();
    if (res.ok) {
      setCategoryStats(data.data);
    } else {
      console.error("Error fetching category stats:", data.message);
    }
  } catch (err) {
    console.error("Failed to fetch category stats", err);
  }
};
useEffect(() => {
  if (accessToken) {
    fetchStats();
    fetchCategoryStats();
  }
}, [accessToken]);


  useEffect(() => {
    if (accessToken) {
      fetchStats();
    }
  }, [accessToken]);

  const StatCard = ({ value, label, icon, variant }) => (
    <Card className={`stat-card border-left-${variant} h-100`}>
      <Card.Body className="d-flex justify-content-between align-items-center">
        <div>
          <Card.Title as="h3" className={`text-${variant} mb-1`}>
            {loading ? <Spinner animation="border" size="sm" /> : value}
          </Card.Title>
          <Card.Subtitle className="text-muted">{label}</Card.Subtitle>
        </div>
        <div className={`icon-container bg-${variant}-light`}>
          {React.cloneElement(icon, { className: `text-${variant}` })}
        </div>
      </Card.Body>
    </Card>
  );

  return (
    <Layout>
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1> Dashboard</h1>
          <p className="subtitle">Overview of your auctions</p>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <StatCard 
              value={stats.total} 
              label="Total Items" 
              icon={<AiOutlineShoppingCart size={24} />} 
              variant="primary" 
            />
          </div>
          <div className="col-md-3">
            <StatCard 
              value={stats.approved} 
              label="Approved Items" 
              icon={<FcApproval size={24} />} 
              variant="success" 
            />
          </div>
          <div className="col-md-3">
            <StatCard 
              value={stats.pending} 
              label="Pending Items" 
              icon={<CgSandClock size={24} />} 
              variant="warning" 
            />
          </div>
          <div className="col-md-3">
            <StatCard 
              value={stats.rejected} 
              label="Rejected Items" 
              icon={<CgClose size={24} />} 
              variant="danger" 
            />
          </div>
        </div>

        <div className="row g-4">
          <div className="col-lg-6">
            <Card className="h-100">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <Card.Title className="mb-0">Recent Pending Items</Card.Title>
                  {items.length > 0 && (
                    <button 
                      className="btn btn-sm btn-link p-0"
                      onClick={() => navigate("/admin/items/pending")}
                    >
                      View All <FiChevronRight />
                    </button>
                  )}
                </div>
                
                {loading ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" variant="secondary" />
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    No pending items at this time
                  </div>
                ) : (
                  <div className="list-group list-group-flush">
                    {items.slice(0, 5).map((item) => (
                      <div
                        key={item._id}
                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-3"
                        onClick={() => navigate(`/admin/items/${item._id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div>
                          <span className="fw-medium">{item.name}</span>
                          <span className={`badge ms-2 bg-${item.status === 'pending' ? 'warning' : item.status === 'available' ? 'success' : 'danger'} text-capitalize`}>
                            {item.status}
                          </span>
                        </div>
                        <FiChevronRight className="text-muted" />
                      </div>
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>
          </div>

          <div className="col-lg-6">
            <Card className="h-100">
              <Card.Body>
                <Card.Title className="mb-3">Item Status Distribution</Card.Title>
                <div style={{ height: '300px' }}>
                  {loading ? (
                    <div className="text-center py-4">
                      <Spinner animation="border" variant="secondary" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [`${value} items`, "Count"]}
                        />
                        <Legend 
                          layout="horizontal"
                          verticalAlign="bottom"
                          align="center"
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Card.Body>
            </Card>
          </div>
                    {/* Categories Overview Section */}
<div className="mt-5">
  <div className="d-flex justify-content-between align-items-center mb-3">
    <h4 className="mb-0">Categories</h4>
    <button 
      className="btn btn-outline-primary btn-sm"
      onClick={() => navigate("/admin/categorieslist")}
    >
      View All Categories
    </button>
  </div>

  <div className="row g-3">
    <div className="col-md-6">
      <StatCard 
        value={categoryStats.total} 
        label="Total Categories" 
        icon={<AiOutlineShoppingCart size={24} />} 
        variant="info" 
      />
    </div>
    <div className="col-md-6">
      <StatCard 
        value={categoryStats.active} 
        label="Active Categories" 
        icon={<FcApproval size={24} />} 
        variant="success" 
      />
    </div>
  </div>
</div>


        </div>
      </div>
    </Layout>
  );
};

export default Item;