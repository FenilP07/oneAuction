import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from "../../components/Navbar.jsx";
import 'bootstrap/dist/css/bootstrap.min.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowTrendUp, faUsers, faMoneyBillTransfer, faEarthAmericas, faGavel, faUsersViewfinder } from '@fortawesome/free-solid-svg-icons';
import './Home.css';

const Home = () => {
    
    return (
        
        <>
        <Navbar />
        <main className="home-page">
            {/* Carousel Section */}
            <section className="carousel-section">
                <div id="howItWorksCarousel" className="carousel slide carousel-fade" data-bs-ride="carousel">
                    <div className="carousel-inner">
                        <div className="carousel-item active">
                            <img src="https://picsum.photos/1200/400?random=1" className="d-block w-100" alt="Browse Auctions" />
                            <div className="carousel-caption d-none d-md-block">
                                <h3>Browse Auctions</h3>
                                <p>Explore a wide range of items up for bid on OneAuction.</p>
                            </div>
                        </div>
                        <div className="carousel-item">
                            <img src="https://picsum.photos/1200/400?random=2" className="d-block w-100" alt="Bid & Win" />
                            <div className="carousel-caption d-none d-md-block">
                                <h3>Bid & Win</h3>
                                <p>Place your bids and win exclusive items at great prices.</p>
                            </div>
                        </div>
                        <div className="carousel-item">
                            <img src="https://picsum.photos/1200/400?random=3" className="d-block w-100" alt="Sell Items" />
                            <div className="carousel-caption d-none d-md-block">
                                <h3>Sell Items</h3>
                                <p>List your items easily and reach a global audience.</p>
                            </div>
                        </div>
                    </div>
                    <button className="carousel-control-prev" type="button" data-bs-target="#howItWorksCarousel" data-bs-slide="prev">
                        <span className="carousel-control-prev-icon" aria-hidden="true"></span>
                        <span className="visually-hidden">Previous</span>
                    </button>
                    <button className="carousel-control-next" type="button" data-bs-target="#howItWorksCarousel" data-bs-slide="next">
                        <span className="carousel-control-next-icon" aria-hidden="true"></span>
                        <span className="visually-hidden">Next</span>
                    </button>
                </div>
            </section>

            {/* Auction Cards Section */}
            <section className="auctions-section container-fluid bg-light p-5">
                <h2 className="text-center my-4 mb-5">Featured Auctions</h2>
                <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4 px-3">
                    {[
                        { id: 1, title: 'Vintage Watch', price: 250, endDate: '2025-07-01', img: 'https://picsum.photos/300/200?random=4', status: 'Featured' },
                        { id: 2, title: 'Antique Vase', price: 150, endDate: '2025-07-02', img: 'https://picsum.photos/300/200?random=5', status: 'New' },
                        { id: 3, title: 'Signed Painting', price: 500, endDate: '2025-07-03', img: 'https://picsum.photos/300/200?random=6', status: 'Featured' },
                        { id: 4, title: 'Classic Guitar', price: 300, endDate: '2025-07-04', img: 'https://picsum.photos/300/200?random=7', status: 'New' },
                        { id: 5, title: 'Rare Book', price: 100, endDate: '2025-07-05', img: 'https://picsum.photos/300/200?random=8', status: 'Featured' },
                        { id: 6, title: 'Designer Bag', price: 400, endDate: '2025-07-06', img: 'https://picsum.photos/300/200?random=9', status: 'New' },
                    ].map((auction) => {
                        const [timeLeft, setTimeLeft] = React.useState(calculateTimeLeft(auction.endDate));
                        React.useEffect(() => {
                            const timer = setInterval(() => {
                                setTimeLeft((prevTimeLeft) => calculateTimeLeft(auction.endDate, prevTimeLeft));
                            }, 1000);
                            return () => clearInterval(timer);
                        }, [auction.endDate]);

                        function calculateTimeLeft(endDate, prevTimeLeft = null) {
                            const now = new Date(); // Use current system time
                            const end = new Date(endDate);
                            const difference = end - now;

                            if (difference <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

                            if (prevTimeLeft) {
                                // Use previous state to avoid recalculating from scratch
                                const prevDiff = prevTimeLeft.days * 86400000 + prevTimeLeft.hours * 3600000 + prevTimeLeft.minutes * 60000 + prevTimeLeft.seconds * 1000;
                                const newDiff = prevDiff - 1000; // Subtract 1 second
                                if (newDiff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

                                const days = Math.floor(newDiff / (1000 * 60 * 60 * 24));
                                const hours = Math.floor((newDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                const minutes = Math.floor((newDiff % (1000 * 60 * 60)) / (1000 * 60));
                                const seconds = Math.floor((newDiff % (1000 * 60)) / 1000);
                                return { days, hours, minutes, seconds };
                            }

                            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
                            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

                            return { days, hours, minutes, seconds };
                        }

                        const timerText = timeLeft.days <= 0 && timeLeft.hours <= 0 && timeLeft.minutes <= 0 && timeLeft.seconds <= 0
                            ? 'Auction Ended'
                            : `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`;

                        return (
                            <div className="col" key={auction.id}>
                                <div className="card h-100 shadow-sm">
                                    <div className="position-relative">
                                        <div className="position-absolute top-0 start-0 bg-white bg-gradient mt-2 ms-2 px-2 py-1 border border-3 border-black rounded-pill">{auction.status}</div>
                                        <div className="position-absolute top-0 end-0 bg-white bg-gradient mt-2 me-2 px-2 py-1 border border-3 border-black rounded-3">
                                            {timerText}
                                        </div>
                                    </div>
                                    <img src={auction.img} className="card-img-top" alt={auction.title} style={{ height: '200px', objectFit: 'cover' }} />
                                    <div className="card-body p-4 border border-3 border-top-0 border-black rounded-bottom-3">
                                        <h3 className="card-title fw-bold">{auction.title}</h3>
                                        <p className="card-text text-dark">discription</p>
                                        <div className='row'>
                                            <div className='col-md-6'>
                                                <p className="card-text text-success m-0 fw-semibold">Current Bid</p>
                                                <h3 className="card-text text-danger fw-bold">${auction.price}</h3>
                                            </div>
                                            <div className='col-md-6'>
                                                <p className="card-text text-success text-end m-0">
                                                    <FontAwesomeIcon icon={faUsers} className='me-2' />41 Bidders
                                                </p>
                                                <p className="card-text text-success text-end">
                                                    <FontAwesomeIcon icon={faArrowTrendUp} className='me-2' /> active
                                                </p>
                                            </div>
                                        </div>
                                        <Link to={`/auction/${auction.id}`} className="btn btn-success mt-3">Bid Now</Link>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* What's Unique Section */}
            <section className="unique-section container-fluid p-5">
                <h2 className="text-center mb-5">What Makes OneAuction Unique</h2>
                <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4 px-5">
                    <div className="col">
                        <div className="card h-100 text-center shadow-sm scale-hover">
                            <div className="card-body">
                                <FontAwesomeIcon className='fa-3x mb-3' icon={faEarthAmericas} />
                                <h5 className="card-title">Global Reach</h5>
                                <p className="card-text">Connect with bidders and sellers worldwide.</p>
                            </div>
                        </div>
                    </div>
                    <div className="col">
                        <div className="card h-100 text-center shadow-sm scale-hover">
                            <div className="card-body">
                                <FontAwesomeIcon className='fa-3x mb-3' icon={faMoneyBillTransfer} />
                                <h5 className="card-title fw-semibold">Secure Transactions</h5>
                                <p className="card-text">Safe payments with trusted encryption.</p>
                            </div>
                        </div>
                    </div>
                    <div className="col">
                        <div className="card h-100 text-center shadow-sm scale-hover">
                            <div className="card-body">
                                <FontAwesomeIcon className='fa-3x mb-3' icon={faUsersViewfinder} />
                                <h5 className="card-title fw-semibold">User-Friendly Interface</h5>
                                <p className="card-text">Easy navigation for all users.</p>
                            </div>
                        </div>
                    </div>
                    <div className="col">
                        <div className="card h-100 text-center shadow-sm scale-hover">
                            <div className="card-body">
                                <FontAwesomeIcon className='fa-3x mb-3' icon={faGavel} />
                                <h5 className="card-title fw-semibold">Real-Time Bidding</h5>
                                <p className="card-text">Live updates for competitive bidding.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Collaborations Section */}
            <section className="collaborations-section container-fluid bg-light p-5">
                <h2 className="text-center mb-5">Our Collaborations</h2>
                <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
                    <div className="col">
                        <div className="card h-100 text-center">
                            <img src="https://picsum.photos/200/100?random=10" className="card-img-top mx-auto mt-3" style={{ width: '100px' }} alt="Partner 1" />
                            <div className="card-body">
                                <h5 className="card-title">Partner 1</h5>
                                <p className="card-text">Leading payment gateway for secure transactions.</p>
                            </div>
                        </div>
                    </div>
                    <div className="col">
                        <div className="card h-100 text-center">
                            <img src="https://picsum.photos/200/100?random=11" className="card-img-top mx-auto mt-3" style={{ width: '100px' }} alt="Partner 2" />
                            <div className="card-body">
                                <h5 className="card-title">Partner 2</h5>
                                <p className="card-text">Logistics for fast and reliable shipping.</p>
                            </div>
                        </div>
                    </div>
                    <div className="col">
                        <div className="card h-100 text-center">
                            <img src="https://picsum.photos/200/100?random=12" className="card-img-top mx-auto mt-3" style={{ width: '100px' }} alt="Partner 3" />
                            <div className="card-body">
                                <h5 className="card-title">Partner 3</h5>
                                <p className="card-text">Authentication for rare and collectible items.</p>
                            </div>
                        </div>
                    </div>
                    <div className="col">
                        <div className="card h-100 text-center">
                            <img src="https://picsum.photos/200/100?random=13" className="card-img-top mx-auto mt-3" style={{ width: '100px' }} alt="Partner 3" />
                            <div className="card-body">
                                <h5 className="card-title">Partner 3</h5>
                                <p className="card-text">Authentication for rare and collectible items.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
        </>
    );
};

export default Home;