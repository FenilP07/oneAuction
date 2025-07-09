import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faArrowTrendUp, faGavel } from '@fortawesome/free-solid-svg-icons';
import 'bootstrap/dist/css/bootstrap.min.css';
import './browseAuction.css';

const BrowseAuctions = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [auctionType, setAuctionType] = useState('all');
    const [timerTexts, setTimerTexts] = useState({});

    const auctions = [
        { id: 1, title: 'Vintage Watch', type: 'Live-Based', price: 250, endDate: '2025-07-20', img: 'https://picsum.photos/300/200?random=17' },
        { id: 2, title: 'Antique Vase', type: 'Time-Based', price: 150, endDate: '2025-07-20', img: 'https://picsum.photos/300/200?random=18' },
        { id: 3, title: 'Signed Painting', type: 'Seal-Based', price: 500, endDate: '2025-07-22', img: 'https://picsum.photos/300/200?random=19' },
        { id: 4, title: 'Classic Guitar', type: 'Live-Based', price: 300, endDate: '2025-07-23', img: 'https://picsum.photos/300/200?random=20' },
    ];

    const filteredAuctions = auctions.filter(auction => 
        auction.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (auctionType === 'all' || auction.type === auctionType)
    );

    useEffect(() => {
        const intervals = filteredAuctions.map(auction => {
            const interval = setInterval(() => {
                setTimerTexts(prev => ({
                    ...prev,
                    [auction.id]: calculateTimeLeft(auction.endDate)
                }));
            }, 1000);
            return interval;
        });
        return () => intervals.forEach(clearInterval);
    }, [filteredAuctions]);

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

    return (
        <>
			<Navbar />
            <h2 className="text-center fw-bold textSecond my-5"><FontAwesomeIcon className='me-2' icon={faGavel} />Browse Auctions</h2>
            
            <section className="container-fluid bgSecond">
                {/* Filter Section */}
                <div className="row g-3 mb-4 py-4 px-5">
                    <div className="col-12 col-md-6">
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
                            <option value="Live-Based">Live-Based</option>
                            <option value="Time-Based">Time-Based</option>
                            <option value="Seal-Based">Seal-Based</option>
                        </select>
                    </div>
                    <div className="col-12 col-md-3">
                        <button className="btn btn-outline-light w-100" onClick={() => { setSearchTerm(''); setAuctionType('all'); }}>Clear Filters</button>
                    </div>
                </div>

                {/* Auctions Section */}
                <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4 pt-0 p-5">
                    {filteredAuctions.map(auction => (
                        <div className="col" key={auction.id}>
                            <div className="card h-100 shadow-sm">
                                <div className="position-relative">
                                    <p className="position-absolute top-0 start-0 bg-white bg-gradient mt-2 ms-2 px-2 py-1 border border-3 border-black rounded-pill">{auction.type}</p>
                                    {/* <div className="position-absolute top-0 end-0 bg-white bg-gradient mt-2 me-2 px-2 py-1 border border-3 border-black rounded-3">
                                        {timerTexts[auction.id] || calculateTimeLeft(auction.endDate)}
                                    </div> */}
                                </div>
                                <img src={auction.img} className="card-img-top" alt={auction.title} style={{ height: '200px', objectFit: 'cover' }} />
                                <div className="card-body p-4 ">
                                    <h3 className="card-title fw-bold">{auction.title}</h3>
                                    <p className="card-text text-dark">description</p>
                                    <div className="row">
                                        <div className='col-12'>Auction Begin: <span className=' text-success pulse-timer'>{timerTexts[auction.id] || calculateTimeLeft(auction.endDate)}</span></div>
                                        <div className="col-6">
                                            <p className="card-text text-success m-0 fw-semibold">Current Bid<span className='fs-6 text-black'> (base price)</span></p>
                                            <h3 className="card-text text-danger fw-bold">${auction.price} <span className='fs-6 text-black'>($100)</span> </h3>
                                        </div>
                                        <div className="col-6">
                                            <p className="card-text text-success text-end m-0">
                                                <FontAwesomeIcon icon={faUsers} className="me-2" />41 Bidders
                                            </p>
                                            <p className="card-text text-success text-end">
                                                <FontAwesomeIcon icon={faArrowTrendUp} className="me-2" /> active
                                            </p>
                                        </div>
                                    </div>
                                    <Link to={`/joinAuction/${auction.type.toLowerCase().replace('-', '')}/${auction.id}`} state={{ auction }} className="btn btn-success mt-3">Bid Now</Link>
                                    <Link to={`/joinAuction/${auction.id}`} state={{ auction }} className="btn btn-success mt-3">Bid Now1</Link>
                                    <Link to={`/auction/${auction.id}`} className="btn btn-success mt-3">Bid Now</Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
            <Footer />
        </>
    );
};

export default BrowseAuctions;