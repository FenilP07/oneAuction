import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../../../components/Layout";
import apiClient from "../../../utils/apiClient";

const ItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);

  const fetchItem = async () => {
    try {
      const res = await apiClient.get(`/item/${id}`);
      setItem(res.data.data.item);
    } catch (error) {
      console.error("Failed to load item:", error.message);
    }
  };

  const handleAction = async (action) => {
    try {
      await apiClient.post(`/item/${id}/${action}`);
      alert(`Item ${action}d successfully.`);
      navigate("/admin/items");
    } catch (error) {
      console.error(`Failed to ${action} item:`, error.message);
    }
  };

  useEffect(() => {
    fetchItem();
  }, [id]);

  if (!item) return <Layout><p>Loading...</p></Layout>;

  return (
    <Layout>
      <div className="item-detail-container">
        <h2>Item Detail</h2>
        <p><strong>Name:</strong> {item.name}</p>
        <p><strong>Description:</strong> {item.description}</p>
        <p><strong>Starting Bid:</strong> ${item.starting_bid}</p>
        <p><strong>Status:</strong> {item.status}</p>

        <button
          onClick={() => handleAction("approve")}
          style={{ marginRight: "10px", background: "green", color: "white", padding: "8px 16px", border: "none", borderRadius: "5px" }}
        >
          Approve
        </button>
        <button
          onClick={() => handleAction("reject")}
          style={{ background: "red", color: "white", padding: "8px 16px", border: "none", borderRadius: "5px" }}
        >
          Reject
        </button>
      </div>
    </Layout>
  );
};

export default ItemDetail;
