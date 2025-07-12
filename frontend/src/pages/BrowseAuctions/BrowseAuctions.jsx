import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faArrowTrendUp, faGavel, faTimes, faClock, faTag, faUser, faEye } from '@fortawesome/free-solid-svg-icons';
import 'bootstrap/dist/css/bootstrap.min.css';
import './browseAuction.css';
import apiClient from '../../utils/apiClient.js';

const BrowseAuctions = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [auctionType, setAuctionType] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [auctions, setAuctions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timerTexts, setTimerTexts] = useState({});
    
    // Preview modal state
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState(null);

    useEffect(() => {
        const fetchAuctions = async () => {
            try {
                setLoading(true);
                const response = await apiClient.get('/auction', {
                    params: {
                        search: searchTerm,
                        type: auctionType === 'all' ? undefined : auctionType,
                        status: statusFilter === 'all' ? undefined : statusFilter,
                        sort: 'starting-soon'
                    }
                });
                setAuctions(response.data.data.auctions || []);
            } catch (err) {
                setError(err.message || 'Failed to fetch auctions');
            } finally {
                setLoading(false);
            }
        };

        const debounceTimer = setTimeout(() => {
            fetchAuctions();
        }, 500);

        return () => clearTimeout(debounceTimer);
    }, [searchTerm, auctionType, statusFilter]);

    useEffect(() => {
        const interval = setInterval(() => {
            const updated = {};
            auctions.forEach(auction => {
                updated[auction._id] = calculateTimeLeft(auction.auction_end_time);
            });
            setTimerTexts(updated);
        }, 1000);

        return () => clearInterval(interval);
    }, [auctions]);

    const calculateTimeLeft = (endDate) => {
        const now = new Date();
        const end = new Date(endDate);
        const difference = end - now;

        if (difference <= 0) return 'Auction Ended';

        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    };

    const getAuctionTypeName = (type) => {
        const name = type?.type_name?.toLowerCase();
        return {
            'live': 'Live-Based',
            'sealed_bid': 'Seal-Based',
            'single_timed_item': 'Time-Based'
        }[name] || type?.type_name || 'Unknown';
    };

    const formatTimeRemaining = (timeRemaining) => {
        if (!timeRemaining) return 'Time expired';
        
        const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) return `${days}d ${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    const fetchAuctionPreview = async (auctionId) => {
        try {
            setPreviewLoading(true);
            setPreviewError(null);
            const response = await apiClient.get(`/auction/${auctionId}`);
            setPreviewData(response.data.data);
            setShowPreview(true);
        } catch (err) {
            setPreviewError(err.message || 'Failed to fetch auction preview');
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleViewDetails = (auction) => {
        if (auction.status === 'active') {
            // Navigate to bidding page for active auctions
            window.location.href = `/joinAuction/${auction.auctionType_id?.type_name?.toLowerCase()}/${auction._id}`;
        } else {
            // Show preview for upcoming/ended auctions
            fetchAuctionPreview(auction._id);
        }
    };

    const closePreview = () => {
        setShowPreview(false);
        setPreviewData(null);
        setPreviewError(null);
    };

    if (loading) return <div className="text-center py-5">Loading auctions...</div>;
    if (error) return <div className="alert alert-danger">{error}</div>;

    return (
        <>
            <Navbar />
            <h2 className="text-center fw-bold textSecond my-5">
                <FontAwesomeIcon className='me-2' icon={faGavel} />Browse Auctions
            </h2>
            
            <section className="container-fluid bgSecond">
                {/* Filter Section */}
                <div className="row g-3 mb-4 py-4 px-5">
                    <div className="col-12 col-md-4">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Search auctions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="col-12 col-md-3">
                        <select
                            className="form-select"
                            value={auctionType}
                            onChange={(e) => setAuctionType(e.target.value)}
                        >
                            <option value="all">All Types</option>
                            <option value="live">Live-Based</option>
                            <option value="single_timed_item">Time-Based</option>
                            <option value="sealed_bid">Seal-Based</option>
                        </select>
                    </div>
                    <div className="col-12 col-md-3">
                        <select
                            className="form-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Statuses</option>
                            <option value="upcoming">Upcoming</option>
                            <option value="active">Active</option>
                            <option value="ended">Ended</option>
                        </select>
                    </div>
                    <div className="col-12 col-md-2">
                        <button 
                            className="btn btn-outline-light w-100" 
                            onClick={() => { 
                                setSearchTerm(''); 
                                setAuctionType('all'); 
                                setStatusFilter('all');
                            }}
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>

                {/* Auctions Section */}
                <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4 pt-0 p-5">
                    {auctions.length === 0 ? (
                        <div className="text-center text-muted">No auctions found.</div>
                    ) : (
                        auctions.map(auction => (
                            <div className="col" key={auction._id}>
                                <div className="card h-100 shadow-sm">
                                    <div className="position-relative">
                                        <p className="position-absolute top-0 start-0 bg-white bg-gradient mt-2 ms-2 px-2 py-1 border border-3 border-black rounded-pill">
                                            {getAuctionTypeName(auction.auctionType_id)}
                                        </p>
                                    </div>
                                    <img 
                                        src={auction.items?.[0]?.images?.[0]?.image_url || 'https://picsum.photos/300/200'} 
                                        className="card-img-top" 
                                        alt={auction.auction_title || 'Auction Image'} 
                                        style={{ height: '200px', objectFit: 'cover' }} 
                                    />
                                    <div className="card-body p-4">
                                        <h3 className="card-title fw-bold">{auction.auction_title}</h3>
                                        <p className="card-text text-dark">{auction.auction_description || 'No description available'}</p>
                                        <div className="row">
                                            <div className='col-12'>
                                                Status: <span className={`text-${auction.status === 'active' ? 'success' : auction.status === 'ended' ? 'danger' : 'warning'} pulse-timer`}>
                                                    {auction.status.charAt(0).toUpperCase() + auction.status.slice(1)}
                                                </span>
                                            </div>
                                            <div className='col-12'>
                                                Time Left: <span className='text-success pulse-timer'>
                                                    {timerTexts[auction._id] || '--'}
                                                </span>
                                            </div>
                                            <div className="col-6">
                                                <p className="card-text text-success m-0 fw-semibold">Current Bid</p>
                                                <h3 className="card-text text-danger fw-bold">
                                                    ${auction.items?.[0]?.starting_bid || 0}
                                                    <span className='fs-6 text-muted'> (Base Price)</span>
                                                </h3>
                                            </div>
                                            <div className="col-6">
                                                <p className="card-text text-success text-end m-0">
                                                    <FontAwesomeIcon icon={faUsers} className="me-2" />
                                                    {auction.current_bidders || 0} Bidders
                                                </p>
                                                <p className="card-text text-success text-end">
                                                    <FontAwesomeIcon icon={faArrowTrendUp} className="me-2" />
                                                    {auction.status}
                                                </p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleViewDetails(auction)}
                                            className="btn btn-success mt-3 w-100"
                                        >
                                            {auction.status === 'active' ? 'Bid Now' : auction.status === 'ended' ? 'View Results' : (
                                                <>
                                                    <FontAwesomeIcon icon={faEye} className="me-2" />
                                                    View Details
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Preview Modal */}
            {showPreview && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    <FontAwesomeIcon icon={faGavel} className="me-2" />
                                    Auction Preview
                                </h5>
                                <button type="button" className="btn-close" onClick={closePreview}></button>
                            </div>
                            <div className="modal-body">
                                {previewLoading && (
                                    <div className="text-center py-4">
                                        <div className="spinner-border text-primary" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                )}
                                
                                {previewError && (
                                    <div className="alert alert-danger">
                                        {previewError}
                                    </div>
                                )}

                                {previewData && (
                                    <div>
                                        {/* Auction Header */}
                                        <div className="row mb-4">
                                            <div className="col-12">
                                                <div className="d-flex justify-content-between align-items-start">
                                                    <div>
                                                        <h4 className="fw-bold">{previewData.auction_title}</h4>
                                                        <p className="text-muted mb-2">{previewData.auction_description}</p>
                                                        <span className={`badge bg-${previewData.status === 'active' ? 'success' : previewData.status === 'ended' ? 'danger' : 'warning'} fs-6`}>
                                                            {previewData.status.charAt(0).toUpperCase() + previewData.status.slice(1)}
                                                        </span>
                                                    </div>
                                                    <div className="text-end">
                                                        <p className="mb-1">
                                                            <FontAwesomeIcon icon={faUser} className="me-2" />
                                                            {previewData.auctioneer.username}
                                                        </p>
                                                        <small className="text-muted">{previewData.auction_type}</small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Timing Info */}
                                        <div className="row mb-4">
                                            <div className="col-md-6">
                                                <div className="card bg-light">
                                                    <div className="card-body text-center">
                                                        <FontAwesomeIcon icon={faClock} className="text-primary fs-3 mb-2" />
                                                        <h6 className="card-title">Time Remaining</h6>
                                                        <p className="card-text fw-bold text-primary">
                                                            {previewData.time_remaining ? formatTimeRemaining(previewData.time_remaining) : 'Auction Ended'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="card bg-light">
                                                    <div className="card-body text-center">
                                                        <FontAwesomeIcon icon={faUsers} className="text-success fs-3 mb-2" />
                                                        <h6 className="card-title">Activity</h6>
                                                        <p className="card-text">
                                                            <span className="fw-bold text-success">{previewData.quick_stats.total_bidders}</span> bidders<br/>
                                                            <span className="fw-bold text-success">{previewData.quick_stats.total_bids}</span> bids
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Featured Items */}
                                        <div className="mb-4">
                                            <h6 className="fw-bold mb-3">
                                                <FontAwesomeIcon icon={faTag} className="me-2" />
                                                Featured Items ({previewData.total_items} total)
                                            </h6>
                                            <div className="row">
                                                {previewData.featured_items.map((item, index) => (
                                                    <div key={item._id} className="col-md-4 mb-3">
                                                        <div className="card">
                                                            <img 
                                                                src={item.image || 'https://picsum.photos/200/150'} 
                                                                className="card-img-top" 
                                                                alt={item.item_name}
                                                                style={{ height: '120px', objectFit: 'cover' }}
                                                            />
                                                            <div className="card-body p-2">
                                                                <h6 className="card-title text-truncate">{item.item_name}</h6>
                                                                <p className="card-text mb-1">
                                                                    <small className="text-muted">Starting: ${item.starting_bid}</small>
                                                                </p>
                                                                <p className="card-text">
                                                                    <span className="text-success fw-bold">Current: ${item.current_bid}</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Quick Stats */}
                                        <div className="row">
                                            <div className="col-12">
                                                <div className="card bg-primary text-white">
                                                    <div className="card-body text-center">
                                                        <h6 className="card-title">Estimated Total Value</h6>
                                                        <h4 className="card-text fw-bold">${previewData.quick_stats.estimated_value}</h4>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closePreview}>
                                    Close
                                </button>
                                {previewData && previewData.status === 'active' && (
                                    <NavLink 
                                        to={`/joinAuction/${previewData.auction_type.toLowerCase()}/${previewData._id}`} 
                                        className="btn btn-success"
                                        onClick={closePreview}
                                    >
                                        Join Auction
                                    </NavLink>
                                )}
                                {previewData && previewData.status !== 'active' && (
                                    <button className="btn btn-outline-primary">
                                        View Full Details
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </>
    );
};

export default BrowseAuctions;