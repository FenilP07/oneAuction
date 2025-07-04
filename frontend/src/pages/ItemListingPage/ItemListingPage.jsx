import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

const ItemListingPage = () => {
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        category: '',
        itemName: '',
        description: '',
        baseBid: '',
        photos: null,
    });
    const [items, setItems] = useState([
        {
            id: Date.now() - 86400000, // Yesterday
            category: 'Jewelry',
            itemName: 'Gold Necklace',
            description: '18k gold necklace with diamond pendant',
            baseBid: '500.00',
            status: 'Approved',
            dateAdded: new Date('2025-06-26T17:39:00-04:00').toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' }),
        },
        {
            id: Date.now() - 43200000, // 12 hours ago
            category: 'Art',
            itemName: 'Oil Painting',
            description: 'Original landscape painting by local artist',
            baseBid: '300.00',
            status: 'Pending',
            dateAdded: new Date('2025-06-27T05:39:00-04:00').toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' }),
        },
        {
            id: Date.now() - 21600000, // 6 hours ago
            category: 'Collectibles',
            itemName: 'Vintage Coin Set',
            description: 'Rare coin collection from the 19th century',
            baseBid: '150.00',
            status: 'Denied',
            dateAdded: new Date('2025-06-27T11:39:00-04:00').toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' }),
        },
        {
            id: Date.now() + 86400000, // Tomorrow
            category: 'Jewelry',
            itemName: 'Silver Bracelet',
            description: 'Sterling silver bracelet with gemstones',
            baseBid: '200.00',
            status: 'Pending',
            dateAdded: new Date('2025-06-28T17:39:00-04:00').toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' }),
        },
    ]);

    const handleAddItemClick = () => {
        setShowForm(true);
    };

    const handleInputChange = (e) => {
        const { name, value, files } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: files ? files[0] : value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const newItem = {
            ...formData,
            status: 'Pending',
            dateAdded: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' }),
            id: Date.now(), // Temporary unique ID
        };
        setItems((prev) => [...prev, newItem]);
        setFormData({ category: '', itemName: '', description: '', baseBid: '', photos: null });
        setShowForm(false);
    };

    return (
        <main className="container mt-4">
            <h2 className="text-center mb-4">Auctioneer Item Management</h2>
            <div className="text-end mb-3">
                <button className="btn btn-primary" onClick={handleAddItemClick}>
                    Add Item
                </button>
            </div>

            {showForm && (
                <div className="card mb-4">
                    <div className="card-body">
                        <h4 className="card-title">Add New Item</h4>
                        <form onSubmit={handleSubmit}>
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <select
                                        className="form-select"
                                        name="category"
                                        value={formData.category}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">Select Category</option>
                                        <option value="Jewelry">Jewelry</option>
                                        <option value="Art">Art</option>
                                        <option value="Collectibles">Collectibles</option>
                                    </select>
                                </div>
                                <div className="col-md-6">
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="itemName"
                                        value={formData.itemName}
                                        onChange={handleInputChange}
                                        placeholder="Item Name"
                                        required
                                    />
                                </div>
                                <div className="col-12">
                                    <textarea
                                        className="form-control"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        placeholder="Description"
                                        rows="3"
                                        required
                                    />
                                </div>
                                <div className="col-md-6">
                                    <input
                                        type="number"
                                        className="form-control"
                                        name="baseBid"
                                        value={formData.baseBid}
                                        onChange={handleInputChange}
                                        placeholder="Base Bid ($)"
                                        min="0"
                                        step="0.01"
                                        required
                                    />
                                </div>
                                <div className="col-md-6">
                                    <input
                                        type="file"
                                        className="form-control"
                                        name="photos"
                                        onChange={handleInputChange}
                                        accept="image/*"
                                    />
                                </div>
                                <div className="col-12 text-end">
                                    <button type="submit" className="btn btn-success me-2">
                                        Submit
                                    </button>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="table-responsive">
                <table className="table table-striped table-hover">
                    <thead>
                        <tr>
                            <th>Index</th>
                            <th>Item Name</th>
                            <th>Description</th>
                            <th>Base Bid ($)</th>
                            <th>Status</th>
                            <th>Date Added</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={item.id}>
                                <td>{index + 1}</td>
                                <td>{item.itemName}</td>
                                <td>{item.description}</td>
                                <td>{item.baseBid}</td>
                                <td>{item.status}</td>
                                <td>{item.dateAdded}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </main>
    );
};

export default ItemListingPage;