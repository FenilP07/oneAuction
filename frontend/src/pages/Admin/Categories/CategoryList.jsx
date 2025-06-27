import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./categoryList.css";

const CategoryList = () => {
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/category");
        const data = await response.json();
        if (data && data.categories) {
          setCategories(data.categories);
        }
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };

    fetchCategories();
  }, []);

  const handleEdit = (id) => {
    navigate(`/category/edit/${id}`);
  };

  return (
    <div className="category-container">
      {categories.map((category) => (
        <div className="category-card" key={category._id}>
          <img
            src={`http://localhost:3000${category.image}`}
            alt={category.name}
            className="category-image"
          />
          <h3 className="category-name">{category.name}</h3>
          <p className="category-description">{category.description}</p>
          <button
            className="edit-btn"
            onClick={() => handleEdit(category._id)}
          >
            Edit
          </button>
        </div>
      ))}
    </div>
  );
};

export default CategoryList;
