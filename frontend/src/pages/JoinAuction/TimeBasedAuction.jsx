import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';

const TimeBasedAuction = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const initialAuction = state?.auction || {};
    const [auction, setAuction] = useState(initialAuction);
    const [bidAmount, setBidAmount] = useState(auction.price + 1000 || 16000); // Min bid + $1000 increment
    const [message, setMessage] = useState('');
    const [timer, setTimer] = useState('01 : 23 : 59 : 48'); // Placeholder, to be calculated

    useEffect(() => {
        if (!auction.id) {
            navigate('/browse');
            return;
        }

        const calculateTimer = () => {
            const now = new Date();
            const end = new Date(auction.endDate);
            const difference = end - now;

            if (difference <= 0) {
                setTimer('Auction Ended');
                return;
            }

            const days = String(Math.floor(difference / (1000 * 60 * 60 * 24))).padStart(2, '0');
            const hours = String(Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
            const minutes = String(Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
            const seconds = String(Math.floor((difference % (1000 * 60)) / 1000)).padStart(2, '0');
            setTimer(`${days} : ${hours} : ${minutes} : ${seconds}`);
        };

        calculateTimer();
        const interval = setInterval(calculateTimer, 1000);
        return () => clearInterval(interval);
    }, [auction, navigate]);

    const handleBid = (e) => {
        e.preventDefault();
        setMessage('');

        if (bidAmount < (auction.price + 100)) {
            setMessage(<div className="alert alert-danger text-center">Bid must be at least ${auction.price + 100}</div>);
            return;
        }

        setMessage(<div className="alert alert-success text-center">Bid of ${bidAmount} placed successfully!</div>);
        setAuction({ ...auction, price: bidAmount });
        setBidAmount(bidAmount + 100); // Increment for next bid
    };

    return (
        <>
            <Navbar />
            <div className="container-fluid p-5 bgSecond">
                <div className="row g-4">
                    {/* LEFT COLUMN */}
                    <div className="col-lg-8">
                        {/* Main Image */}
                        <div className="card bg-white mb-4">
                            <img src={auction.img || 'https://via.placeholder.com/800x400'} className="card-img-top" alt={auction.title} />
                            <div className="card-body d-flex gap-2 mt-2">
                                <img src="https://via.placeholder.com/80" alt="thumb1" className="img-thumbnail" />
                                <img src="https://via.placeholder.com/80" alt="thumb2" className="img-thumbnail" />
                                <img src="https://via.placeholder.com/80" alt="thumb3" className="img-thumbnail" />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="card bg-white mb-4">
                            <div className="card-body">
                                <h3 className="card-title fw-bold textSecond">Description</h3>
                                
							<blockquote class="blockquote">
                                <p className="card-text text-black">
                                    An exceptional vintage Rolex Submariner from 1970 in remarkable condition. This timepiece features the iconic black dial and bezel, original bracelet, and has been recently serviced. A true collector’s piece with original papers and box.
                                    The watch shows minimal wear consistent with its age and has been carefully maintained.
                                </p>
							</blockquote>
                            </div>
                        </div>

                        {/* Specifications */}
                        <div className="card bg-white">
                            <div className="card-body">
                                <h5 className="card-title text-black">Specifications</h5>
                                <div className="row">
                                    <div className="col-md-6">
                                        <p className='text-black'><strong>Brand:</strong> Rolex</p>
                                        <p className='text-black'><strong>Year:</strong> 1970</p>
                                        <p className='text-black'><strong>Movement:</strong> Automatic</p>
                                        <p className='text-black'><strong>Condition:</strong> Excellent</p>
                                    </div>
                                    <div className="col-md-6">
                                        <p className='text-black'><strong>Model:</strong> Submariner</p>
                                        <p className='text-black'><strong>Case Material:</strong> Stainless Steel</p>
                                        <p className='text-black'><strong>Water Resistance:</strong> 200m</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="col-lg-4">
                        {/* Auction Info */}
                        <div className="card bg-white mb-4">
                            <div className="card-body">
                                <h2 className="card-title textSecond fw-bold">{auction.title || 'Vintage Rolex Submariner 1970 - Rare Collectible'}</h2>
                                <h4 className="textSecond fw-bold">Current Bid: <span className="text-success fw-bold">${auction.price || 15750}</span></h4>
                                <p className="mb-2 text-black">Starting bid: $8,000</p>
                                <div className="text-center">
                                    <span className="badge bg-dark fs-5">{timer}</span>
                                </div>
                            </div>
                        </div>

                        {/* Place Your Bid */}
                        <div className="card bg-white mb-4">
                            <div className="card-body">
                                <h5 className="card-title">Place Your Bid</h5>
                                {message && message}
                                <label className="form-label">Bid Amount (Min: ${auction.price + 1000 || 16750})</label>
                                <div className="input-group mb-3">
                                    <span className="input-group-text">$</span>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={bidAmount}
                                        onChange={(e) => setBidAmount(Math.max(auction.price + 1000, parseInt(e.target.value) || 0))}
                                    />
                                </div>
                                <button
                                    className="btn btn-primary w-100 mb-3"
                                    onClick={handleBid}
                                >
                                    Bid
                                </button>
                                <div className="d-flex justify-content-between">
                                    <button className="btn btn-outline-secondary" onClick={() => setBidAmount(auction.price + 1000)}>${auction.price + 1000}</button>
                                    <button className="btn btn-outline-secondary" onClick={() => setBidAmount(auction.price + 1500)}>${auction.price + 1500}</button>
                                    <button className="btn btn-outline-secondary" onClick={() => setBidAmount(auction.price + 2000)}>${auction.price + 2000}</button>
                                </div>
                            </div>
                        </div>

                        {/* Seller Info */}
                        <div className="card bg-white mb-4">
                            <div className="card-body">
                                <h5 className="card-title">Seller Information</h5>
                                <div className="d-flex justify-content-between align-items-center">
                                    <span><strong>TimeCollector</strong></span>
                                    <span className="badge bg-success">Verified</span>
                                </div>
                                <p className="mt-2 mb-1">Rating: <strong>4.9/5.0 ⭐</strong></p>
                                <p>Total Sales: <strong>156</strong></p>
                                <button className="btn btn-outline-primary btn-sm w-100">View Seller Profile</button>
                            </div>
                        </div>

                        {/* Bidding History */}
                        <div className="card bg-white">
                            <div className="card-body">
                                <h5 className="card-title">Bidding History</h5>
                                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                    <ul className="list-group list-group-flush">
                                        <li className="list-group-item d-flex justify-content-between">
                                            <span>WatchLover123</span>
                                            <span className="text-success fw-bold">${auction.price || 15750} (Winning)</span>
                                        </li>
                                        <li className="list-group-item d-flex justify-content-between">
                                            <span>TimeCollector</span>
                                            <span>$15,500</span>
                                        </li>
                                        <li className="list-group-item d-flex justify-content-between">
                                            <span>VintageHunter</span>
                                            <span>$15,250</span>
                                        </li>
                                        <li className="list-group-item d-flex justify-content-between">
                                            <span>RolexFan</span>
                                            <span>$15,000</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
};

export default TimeBasedAuction;