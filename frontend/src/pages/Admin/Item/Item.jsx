import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../../components/Layout";
import Box from "../../../components/Box";
import "./item.css";

import { AiOutlineShoppingCart } from "react-icons/ai";
import { FcApproval } from "react-icons/fc";
import { CgSandClock, CgClose } from "react-icons/cg";
import useAuthStore from "../../../store/authStore";



const Item = () => {
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
  });

  const { accessToken } = useAuthStore();


  const [items, setItems] = useState([]);
  const navigate = useNavigate();

 const fetchStats = async () => {
  try {
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
  }
};




useEffect(() => {
  if (accessToken) {
    fetchStats();
  }
}, [accessToken]);

  return (
    <Layout>
      <div className="item-container">
        <div className="item-box">
          <div className="item-content box stack-top">
            <div className="box-container">
              <Box
                style="inner-box"
                num={stats.total}
                name="Total Items"
                icon={<AiOutlineShoppingCart />}
              />
              <Box
                style="inner-box"
                num={stats.approved}
                name="Approved Items"
                icon={<FcApproval />}
              />
              <Box
                style="inner-box"
                num={stats.pending}
                name="Pending Items"
                icon={<CgSandClock />}
              />
              <Box
                style="inner-box"
                num={stats.rejected}
                name="Rejected Items"
                icon={<CgClose />}
              />
            </div>
          </div>
        </div>

        <div className="item-body">
          <div className="recent-items box1">
            <p>Recent Pending Items</p>
           <ul className="item-list">
  {items.length === 0 ? (
    <li>No pending items</li>
  ) : (
    items.map((item) => (
      <li
        key={item._id}
        className="clickable-item"
        onClick={() => navigate(`/admin/items/${item._id}`)}
      >
        {item.name} - <em>{item.status}</em>
      </li>
    ))
  )}
</ul>

          </div>

          <div className="chart box1">
            <p>Bar Chart (Coming Soon)</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Item;
