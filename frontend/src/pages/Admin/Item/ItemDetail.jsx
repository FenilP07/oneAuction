import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../../../components/Layout";
import apiClient from "../../../utils/apiClient";
import { FiArrowLeft, FiCheck, FiX } from "react-icons/fi";
import { MdOutlinePhotoCamera } from "react-icons/md";

const ItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [images, setImages] = useState([]);
  const [primaryImage, setPrimaryImage] = useState(null);

  const fetchItem = async () => {
    try {
      const res = await apiClient.get(`/item/${id}`);
      setItem(res.data.data.item);
      const itemImages = res.data.data.images || [];
      setImages(itemImages);
      setPrimaryImage(itemImages.find(img => img.is_primary) || itemImages[0]);
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

  if (!item) {
    return (
      <Layout>
        <div className="loading-container">
          <p>Loading item details...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="item-detail-container">
        <button 
          className="back-button"
          onClick={() => navigate("/admin/items")}
        >
          <FiArrowLeft /> Back to Items
        </button>

        <div className="item-header">
          <h1>{item.name}</h1>
          <div className={`status-badge ${item.status}`}>
            {item.status.toUpperCase()}
          </div>
          
        </div>

        <div className="item-content">
          {/* Image Gallery Section */}
          <div className="image-section">
            {primaryImage ? (
              <div className="primary-image-container">
                <img
                  src={primaryImage.image_url}
                  alt={item.name}
                  className="primary-image"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://via.placeholder.com/600x400?text=No+Image";
                  }}
                />
              </div>
            ) : (
              <div className="no-image-placeholder">
                <MdOutlinePhotoCamera size={48} />
                <p>No images available</p>
              </div>
            )}

            {images.length > 1 && (
              <div className="thumbnail-container">
                {images.map((img) => (
                  <div
                    key={img._id}
                    className={`thumbnail ${img._id === primaryImage?._id ? 'active' : ''}`}
                    onClick={() => setPrimaryImage(img)}
                  >
                    <img
                      src={img.image_url}
                      alt={`Thumbnail ${img._id}`}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://via.placeholder.com/100?text=Thumb";
                      }}
                    />
                    {img.is_primary && <span className="primary-badge">Primary</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Item Details Section */}
          <div className="details-section">
            <div className="detail-card">
              <h3>Item Information</h3>
              <div className="detail-row">
                <span className="detail-label">Description:</span>
                <span className="detail-value">{item.description || "N/A"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Category:</span>
                <span className="detail-value">{item.category_id?.name || "N/A"}</span>
              </div>
            </div>

            <div className="detail-card">
              <h3>Bidding Information</h3>
              <div className="detail-row">
                <span className="detail-label">Starting Bid:</span>
                <span className="detail-value">${item.starting_bid?.toLocaleString() || "0"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Current Bid:</span>
                <span className="detail-value">${item.current_bid?.toLocaleString() || "0"}</span>
              </div>
            </div>

            <div className="detail-card">
              <h3>User Information</h3>
              <div className="detail-row">
                <span className="detail-label">Auctioneer:</span>
                <span className="detail-value">{item.auctioneer_id?.username || "N/A"}</span>
              </div>
            

              
            </div>
             <div className="action-btn">
          <button
            onClick={() => handleAction("approve")}
            style={{
              marginRight: "10px",
              background: "green",
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: "5px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Approve
          </button>
          <button
            onClick={() => handleAction("reject")}
            style={{
              background: "red",
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: "5px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Reject
          </button>
        </div>
          </div>
          
        </div>

        

      </div>
    </Layout>
  );
};

export default ItemDetail;