import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./categories.css";
import Layout from "../../../components/Layout";
import EditCategoryModal from "./EditCategoryModal";

const CategoryList = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const fetchCategories = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/category");
      const data = await response.json();
      if (data && data.data && data.data.categories) {
        setCategories(data.data.categories);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleEdit = (category) => {
    setSelectedCategory(category);
    setShowModal(true);
  };

  return (
    <Layout>
      <div className="main-content">
        <h3 className="category-title">Categories</h3>

        <div className="category-container">
         {categories.map((category) => (
  <div
    className={`category-card ${!category.is_active ? "inactive-card" : ""}`}
    key={category._id}
    style={{
      backgroundImage: `url(${
        category.image
          ? `http://localhost:3000/${category.image.replace(/\\/g, "/")}`
          : "https://via.placeholder.com/100"
      })`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      position: "relative", // to position badge inside
    }}
  >
    <div className="category-overlayyyy">
      {!category.is_active && (
        <div className="deactivated-badge">Deactivated</div>
      )}
      <h4 className="category-name">{category.name}</h4>
      <p className="category-description">{category.description}</p>
      <button className="edit-btn" onClick={() => handleEdit(category)}>
        Edit
      </button>
    </div>
  </div>
))}

        </div>

        {showModal && selectedCategory && (
          <EditCategoryModal
            category={selectedCategory}
            onClose={() => setShowModal(false)}
            onUpdated={() => {
              fetchCategories();
              setShowModal(false);
            }}
          />
        )}
      </div>
    </Layout>
  );
};

export default CategoryList;
