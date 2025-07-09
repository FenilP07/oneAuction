import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

const AuctionModal = ({ onAuctionCreate }) => {
    const [showModal, setShowModal] = useState(false);
    const [auctionType, setAuctionType] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [auctionData, setAuctionData] = useState({
        startDate: '',
        startTime: '',
        timePeriod: '',
        agreement: false,
        items: [],
        sequence: [],
    });
    const [items] = useState([
        { id: 1, itemName: 'Gold Watch', photo: 'https://picsum.photos/200/200?random=1', baseBid: '400.00', description: 'Luxury gold watch with leather strap' },
        { id: 2, itemName: 'Oil Painting', photo: 'https://picsum.photos/200/200?random=2', baseBid: '300.00', description: 'Classic landscape oil painting' },
        { id: 3, itemName: 'Vintage Coin', photo: 'https://picsum.photos/200/200?random=3', baseBid: '150.00', description: 'Rare 19th-century coin collection' },
    ]);

    const currentDate = new Date().toISOString().split('T')[0]; // 2025-07-02
    const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }).slice(0, 5); // 18:18

    const handleAuctionCreate = (data) => {
        onAuctionCreate(data);
        setShowModal(false);
        setAuctionType(null);
        setSelectedItem(null);
        setAuctionData({ startDate: '', startTime: '', agreement: false, items: [], sequence: [] });
    };

    const handleItemSelect = (item) => {
        setAuctionData((prev) => {
            const itemIndex = prev.items.indexOf(item.id);
            if (itemIndex > -1) {
                const newItems = prev.items.filter((id) => id !== item.id);
                const newSequence = prev.sequence.filter((_, idx) => prev.items[idx] !== item.id);
                return { ...prev, items: newItems, sequence: newSequence };
            } else {
                return { ...prev, items: [...prev.items, item.id], sequence: [...prev.sequence, prev.sequence.length + 1] };
            }
        });
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setAuctionData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSequenceChange = (index, value) => {
        const newSequence = [...auctionData.sequence];
        newSequence[index] = parseInt(value) || 1;
        setAuctionData((prev) => ({ ...prev, sequence: newSequence }));
    };

    // Sort items based on sequence
    const getOrderedItems = () => {
        if (auctionData.items.length === 0) return [];
        const itemMap = auctionData.items.map((id, idx) => ({ id, seq: auctionData.sequence[idx] || (idx + 1) }));
        return itemMap
            .sort((a, b) => a.seq - b.seq)
            .map(sorted => items.find(item => item.id === sorted.id));
    };

    // Validate sequence numbers
    const validateSequence = () => {
        const numItems = auctionData.items.length;
        if (numItems === 0) return true;
        const sequenceSet = new Set(auctionData.sequence);
        const expectedSequence = Array.from({ length: numItems }, (_, i) => i + 1);
        return sequenceSet.size === numItems && auctionData.sequence.every(seq => expectedSequence.includes(seq));
    };

    useEffect(() => {
        if (showModal) {
            const modal = document.querySelector('.modal');
            modal.classList.add('show');
            modal.style.display = 'block';
            document.body.classList.add('modal-open');
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fade show';
            document.body.appendChild(backdrop);
            return () => {
                modal.classList.remove('show');
                modal.style.display = 'none';
                document.body.classList.remove('modal-open');
                document.body.removeChild(backdrop);
            };
        }
    }, [showModal]);

    return (
        <>
            <div className="d-flex justify-content-end mb-3">
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    Create Your Auction
                </button>
            </div>
            <div className="modal fade" tabIndex="-1" role="dialog">
                <div className="modal-dialog modal-lg" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Create Auction</h5>
                            <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                        </div>
                        <div className="modal-body">
                            {!auctionType ? (
                                <div className="text-center">
                                    <p>Select Auction Type</p>
                                    <div className="d-flex justify-content-center gap-3">
                                        <button
                                            className="btn btn-outline-primary"
                                            onClick={() => setAuctionType('Time-Based')}
                                        >
                                            Time-Based Auction
                                        </button>
                                        <button
                                            className="btn btn-outline-primary"
                                            onClick={() => setAuctionType('Live')}
                                        >
                                            Live Auction
                                        </button>
                                        <button
                                            className="btn btn-outline-primary"
                                            onClick={() => setAuctionType('Sealed Bid')}
                                        >
                                            Sealed Bid Auction
                                        </button>
                                    </div>
                                </div>
                            ) : !selectedItem ? (
                                <>
                                <div className="row row-cols-1 row-cols-md-3 g-4">
                                    {auctionType === 'Live' ? (
                                        items.map((item) => (
                                            <div className="col" key={item.id}>
                                                <div className="card h-100">
                                                    <img src={item.photo} className="card-img-top" alt={item.itemName} style={{ height: '200px', objectFit: 'cover' }} />
                                                    <div className="card-body">
                                                        <h5 className="card-title">{item.itemName}</h5>
                                                        <p className="card-text">Base Price: ${item.baseBid}</p>
                                                        <button
                                                            className={`btn ${auctionData.items.includes(item.id) ? 'btn-success' : 'btn-primary'}`}
                                                            onClick={() => handleItemSelect(item)}
                                                        >
                                                            {auctionData.items.includes(item.id) ? 'Selected' : 'Select'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        items.map((item) => (
                                            <div className="col" key={item.id}>
                                                <div className="card h-100">
                                                    <img src={item.photo} className="card-img-top" alt={item.itemName} style={{ height: '200px', objectFit: 'cover' }} />
                                                    <div className="card-body">
                                                        <h5 className="card-title">{item.itemName}</h5>
                                                        <p className="card-text">Base Price: ${item.baseBid}</p>
                                                        <button className="btn btn-primary" onClick={() => setSelectedItem(item)}>
                                                            Select
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    
                                </div>
                                <div className='row justify-content-end'>
                                    <div className="text-end mt-3">
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => {
                                                if (auctionType === 'Live' && auctionData.items.length >= 3) {
                                                    const selectedItems = auctionData.items.map(id => items.find(i => i.id === id));
                                                    setSelectedItem({ id: 'multiple', itemNames: selectedItems.map(i => i.itemName).join(', '), items: selectedItems });
                                                } else if (auctionType !== 'Live' && selectedItem) {
                                                    setSelectedItem(selectedItem);
                                                }
                                            }}
                                            disabled={auctionType === 'Live' ? auctionData.items.length < 3 : !selectedItem}
                                        >
                                            {auctionType === 'Live' ? 'Next' : 'Select'}
                                        </button>
                                    </div>
                                </div>
                                </>
                            ) : (
                                <div className="card">
                                    <div className="card-body">
                                        <h4 className="card-title">Create {auctionType} Auction</h4>
                                        <form onSubmit={(e) => {
                                            e.preventDefault();
                                            if (auctionType === 'Live' && !validateSequence()) {
                                                alert('Please ensure each item has a unique sequence number from 1 to ' + auctionData.items.length + '.');
                                                return;
                                            }
                                            handleAuctionCreate(auctionData);
                                        }}>
                                            <div className="row g-3">
                                                {auctionType === 'Live' && selectedItem.id === 'multiple' && (
                                                    <div className="col-12">
                                                        {getOrderedItems().map((item, index) => (
                                                            <div key={item.id} className="d-flex align-items-center mb-2">
                                                                <img src={item.photo} alt={item.itemName} style={{ width: '100px', height: '100px', objectFit: 'cover', marginRight: '10px' }} />
                                                                <span>{item.itemName} - ${item.baseBid} (Seq: </span>
                                                                <input
                                                                    type="number"
                                                                    className="form-control form-control-sm"
                                                                    style={{ width: '60px', display: 'inline-block', margin: '0 5px' }}
                                                                    value={auctionData.sequence[index] || (index + 1)}
                                                                    onChange={(e) => handleSequenceChange(index, e.target.value)}
                                                                    min="1"
                                                                    max={auctionData.items.length}
                                                                />
                                                                <span>)</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {auctionType !== 'Live' && selectedItem && (
                                                    <>
                                                        <div className="col-12">
                                                            <img src={selectedItem.photo} className="img-fluid mb-2" alt={selectedItem.itemName} style={{ maxHeight: '200px', objectFit: 'cover' }} />
                                                        </div>
                                                        <div className="col-12">
                                                            <p><strong>Item Name:</strong> {selectedItem.itemName}</p>
                                                        </div>
                                                        <div className="col-12">
                                                            <p><strong>Description:</strong> {selectedItem.description}</p>
                                                        </div>
                                                        <div className="col-12">
                                                            <p><strong>Base Price:</strong> ${selectedItem.baseBid}</p>
                                                        </div>
                                                    </>
                                                )}
                                                {auctionType === 'Time-Based' && (
                                                    <>
                                                        <div className="col-md-6">
                                                            <label for="endDate" class="form-label">End Date:</label>
                                                            <input
                                                                type="date"
                                                                className="form-control"
                                                                name="endDate"
                                                                value={auctionData.startDate}
                                                                onChange={handleInputChange}
                                                                min={currentDate}
                                                                required
                                                            />
                                                        </div>
                                                        <div className="col-md-6">
                                                            <label for="endTime" class="form-label">End Time:</label>
                                                            <input
                                                                type="time"
                                                                className="form-control"
                                                                name="endTime"
                                                                value={auctionData.startTime}
                                                                onChange={handleInputChange}
                                                                min={auctionData.startDate === currentDate ? currentTime : '00:00'}
                                                                required
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                                {auctionType === 'Live' && (
                                                    <>
                                                        <div className="col-md-6">
                                                            <label for="startDate" class="form-label">Start Date:</label>
                                                            <input
                                                                type="date"
                                                                className="form-control"
                                                                name="startDate"
                                                                id="startDate"
                                                                value={auctionData.startDate}
                                                                onChange={handleInputChange}
                                                                min={currentDate}
                                                                required
                                                            />
                                                        </div>
                                                        <div className="col-md-6">
                                                            <label for="startTime" class="form-label">Start Time:</label>
                                                            <input
                                                                type="time"
                                                                className="form-control"
                                                                name="startTime"
                                                                value={auctionData.startTime}
                                                                onChange={handleInputChange}
                                                                min={auctionData.startDate === currentDate ? currentTime : '00:00'}
                                                                required
                                                            />
                                                        </div>
                                                        <div className="col-12">
                                                            <p className="text-danger">
                                                                Caution: This is a live auction. If only one person bids, it will close automatically 1 minute after the last bid, and you are obligated to sell.
                                                            </p>
                                                            <div className="form-check">
                                                                <input
                                                                    type="checkbox"
                                                                    className="form-check-input"
                                                                    name="agreement"
                                                                    id="liveBaseAgreement"
                                                                    checked={auctionData.agreement}
                                                                    onChange={handleInputChange}
                                                                    required
                                                                />
                                                                <label className="form-check-label" for="liveBaseAgreement">I agree to the terms</label>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                                {auctionType === 'Sealed Bid' && (
                                                    <>
                                                        <div className="col-md-6">
                                                            <label for="endDate" class="form-label">End Date:</label>
                                                            <input
                                                                type="date"
                                                                className="form-control"
                                                                name="endDate"
                                                                value={auctionData.startDate}
                                                                onChange={handleInputChange}
                                                                min={currentDate}
                                                                required
                                                            />
                                                        </div>
                                                        <div className="col-md-6">
                                                            <label for="endTime" class="form-label">End Time:</label>
                                                            <input
                                                                type="time"
                                                                className="form-control"
                                                                name="endTime"
                                                                value={auctionData.startTime}
                                                                onChange={handleInputChange}
                                                                min={auctionData.startDate === currentDate ? currentTime : '00:00'}
                                                                required
                                                            />
                                                        </div>
                                                        <div className="col-12">
                                                            <div className="form-check">
                                                                <input
                                                                    type="checkbox"
                                                                    className="form-check-input"
                                                                    name="agreement"
                                                                    checked={auctionData.agreement}
                                                                    onChange={handleInputChange}
                                                                    required
                                                                />
                                                                <label className="form-check-label">
                                                                    I agree that users can only see base price and bid blindly; the highest bidder wins.
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                                <div className="col-12 text-end">
                                                    <button type="submit" className="btn btn-success" disabled={auctionType !== 'Time-Based' && !auctionData.agreement}>
                                                        Create Auction
                                                    </button>
                                                </div>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            {selectedItem && (
                                <button type="button" className="btn btn-secondary" onClick={() => setSelectedItem(null)}>
                                    Back to Items
                                </button>
                            )}
                            {auctionType && !selectedItem && (
                                <button type="button" className="btn btn-secondary" onClick={() => setAuctionType(null)}>
                                    Back to Types
                                </button>
                            )}
                            <button type="button" className="btn btn-danger" onClick={() => setShowModal(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AuctionModal;