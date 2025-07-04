import React from 'react';
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

const Footer = () => {
    return (
        <footer className="footer bg-dark text-white py-4">
            <div className="container">
                <div className="row">
                    {/* Left Column - Company */}
                    <div className="col-md-4 text-md-start">
                        <img src="/images/AuctionLogo.png" className="img-fluid rounded mb-3" alt="OneAuction Logo" />
                        <p className="mb-0">Discover unique items and bid with confidence on our premier auction platform, powered by MaxFyare Technologies.</p>
                    </div>

                    {/* Middle Column - Pages */}
                    <div className="col-md-4 mb-3 mb-md-0 text-center">
                        <h5>Pages</h5>
                        <ul className="list-unstyled">
                            <li><Link to="/" className="text-white text-decoration-none">Home</Link></li>
                            <li><Link to="/about" className="text-white text-decoration-none">About Us</Link></li>
                            <li><Link to="/browseAuctions" className="text-white text-decoration-none">Browse Auctions</Link></li>
                            <li><Link to="/help" className="text-white text-decoration-none">Help</Link></li>
                        </ul>
                    </div>

                    {/* Right Column - Logo and Description */}
                    <div className="col-md-4 mb-3 mb-md-0">
                        <h5>Company</h5>
                        <p>MaxFyare Technologies<br />123 Auction Lane, Tech City, TC 45678<br />Email: support@oneauction.com</p>
                        <ul className="list-unstyled">
                            <li><Link to="/privacy" className="text-white text-decoration-none">Privacy Policy</Link></li>
                            <li><Link to="/terms" className="text-white text-decoration-none">Terms of Service</Link></li>
                            <li><Link to="/contact" className="text-white text-decoration-none">Contact Us</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="text-center mt-3">
                    <p className="mb-0">&copy; {new Date().getFullYear()} OneAuction. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;