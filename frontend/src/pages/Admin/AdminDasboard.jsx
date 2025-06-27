import React from "react";
import Layout from "../../components/Layout";
import "./dashboard.css";

const AdminDashboard = () => {
  return (
    <Layout>
      <div className="dashboard-container">
        <div className="dashboard-title box">
          <h4>Welcome to Dashboard</h4>
        </div>
        {/* Rest of dashboard UI here... */}
      </div>
    </Layout>
  );
};

export default AdminDashboard;
