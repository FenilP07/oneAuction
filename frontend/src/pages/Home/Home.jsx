import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowTrendUp, faUsers, faMoneyBillTransfer, faEarthAmericas, faGavel, faUsersViewfinder, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import './Home.css';

const Home = () => {
    return (
        <>
            <Navbar />
            <main className="home-page">
                {/* Carousel Section */}
                <section className="carousel-section m-3">
                    <div id="howItWorksCarousel" className="carousel slide carousel-fade" data-bs-ride="carousel">
                        <div className="carousel-inner">
                            <div className="carousel-item active">
                                <img src="/public/images/carousels/1.png" className="d-block w-100" alt="Browse Auctions" />
                            </div>
                            <div className="carousel-item">
                                <img src="/public/images/carousels/2.png" className="d-block w-100" alt="Bid & Win" />
                            </div>
                            <div className="carousel-item">
                                <img src="/public/images/carousels/3.png" className="d-block w-100" alt="Sell Items" />
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
                <section className="browse-auctions-section container-fluid p-5 bgOne">
                    <h2 className="text-center fw-bold textOne mb-5"><FontAwesomeIcon className='me-2' icon={faGavel} />Browse Auctions</h2>
                    <div className="row g-4 justify-content-center">
                        <div className="col-12 col-md-4 text-center">
                            <h4 className='fw-bold textOne'>Live-Based</h4>
                            <p className="mb-0 textOne">Join real-time auctions with live bidding, ending when the timer runs out or activity ceases.</p>
                        </div>
                        <div className="col-12 col-md-4 text-center">
                            <h4 className='fw-bold textOne'>Time-Based</h4>
                            <p className="mb-0 textOne">Bid within a set time frame, with the highest bid winning at the auction's scheduled close.</p>
                        </div>
                        <div className="col-12 col-md-4 text-center">
                            <h4 className='fw-bold textOne'>Sealed-Based</h4>
                            <p className="mb-0 textOne">Submit blind bids, with the highest offer revealed and winning after the deadline.</p>
                        </div>
                    </div>
                    <div className="text-center mt-4">
                        <Link to="/browseAuctions">
                            <button className="btn btn-outline-light btn-lg">Browse Auctions</button>
                        </Link>
                    </div>
                </section>

                {/* How It Works Section */}
                <section className="how-it-works-section container-fluid py-5 bgSecond">
                    <h2 className="text-center fw-bold textSecond mb-5"><FontAwesomeIcon className='me-2' icon={faGavel} />How It Works</h2>
                    {/* For Users */}
                    <div className="row mb-5">
                        <div className="col-12 px-5">
                            <div className="row row-cols-1 row-cols-md-6 g-3 justify-content-center">
                                <div className="col align-self-center">
                                    <h3 className="text-center mb-4 textSecond">For Users <FontAwesomeIcon className='d-inline d-none d-md-inline' icon={faArrowRight} /></h3>
                                </div>
                                <div className="col text-center">
                                    <div className="display-6 fw-bolder textSecond mb-2">1</div>
                                    <h6 className="mb-1">Log In or Sign Up</h6>
                                    <p className="mb-0 small">Create an account or log in to explore auctions securely.</p>
                                </div>
                                <div className="col text-center">
                                    <div className="display-6 fw-bolder textSecond mb-2">2</div>
                                    <h6 className="mb-1">Select Auction</h6>
                                    <p className="mb-0 small">Browse and pick from live and timed auctions.</p>
                                </div>
                                <div className="col text-center">
                                    <div className="display-6 fw-bolder textSecond mb-2">3</div>
                                    <h6 className="mb-1">Place Your Bid</h6>
                                    <p className="mb-0 small">Compete in real-time to secure your item.</p>
                                </div>
                                <div className="col text-center">
                                    <div className="display-6 fw-bolder textSecond mb-2">4</div>
                                    <h6 className="mb-1">Win the Auction</h6>
                                    <p className="mb-0 small">Outbid others to claim your prize.</p>
                                </div>
                                <div className="col text-center">
                                    <div className="display-6 fw-bolder textSecond mb-2">5</div>
                                    <h6 className="mb-1">Get Your Item</h6>
                                    <p className="mb-0 small">Receive your item via trusted shipping.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* For Sellers */}
                    <div className="row">
                        <div className="col-12">
                            <div className="row row-cols-1 row-cols-md-6 g-3 px-5 justify-content-center">
                                <div className="col align-self-center">
                                    <h3 className="text-center mb-4 textSecond">For Sellers <FontAwesomeIcon className='d-inline d-none d-md-inline' icon={faArrowRight} /></h3>
                                </div>
                                <div className="col text-center">
                                    <div className="display-6 fw-bolder textSecond mb-2">1</div>
                                    <h6 className="mb-1">Log In or Sign Up</h6>
                                    <p className="mb-0 small">Create a seller account or log in securely.</p>
                                </div>
                                <div className="col text-center">
                                    <div className="display-6 fw-bolder textSecond mb-2">2</div>
                                    <h6 className="mb-1">Fill Sell Items Form</h6>
                                    <p className="mb-0 small">Add item details and set your bid.</p>
                                </div>
                                <div className="col text-center">
                                    <div className="display-6 fw-bolder textSecond mb-2">3</div>
                                    <h6 className="mb-1">Get Approval</h6>
                                    <p className="mb-0 small">Listing reviewed for authenticity.</p>
                                </div>
                                <div className="col text-center">
                                    <div className="display-6 fw-bolder textSecond mb-2">4</div>
                                    <h6 className="mb-1">Arrange Auction Time</h6>
                                    <p className="mb-0 small">Schedule at your preferred time.</p>
                                </div>
                                <div className="col text-center">
                                    <div className="display-6 fw-bolder textSecond mb-2">5</div>
                                    <h6 className="mb-1">Get Valuable Price</h6>
                                    <p className="mb-0 small">Earn from global bidders.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* What's Unique Section */}
                <section className="unique-section container-fluid bgOne p-5">
                    <h2 className="text-center textOne fw-bold mb-5"><FontAwesomeIcon className='me-2' icon={faGavel} />What Makes OneAuction Unique</h2>
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
                <section className="collaborations-section container-fluid bgSecond p-5">
                    <h2 className="text-center mb-5"><FontAwesomeIcon className='me-2' icon={faGavel} />Our Collaborations</h2>
                    <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
                        <div className="col text-center">
                            <div className='homePartnerLogo'>
                                <img src="/images/partner/one.jpg" className="mx-auto mb-3 partnerImg" alt="Partner 1" />
                            </div>
                            <h5 className="card-title">403 Auction</h5>
                            <p className="card-text">Leading payment gateway for secure transactions.</p>
                        </div>
                        <div className="col text-center">
                            <div className='homePartnerLogo'>
                                <img src="/images/partner/second.png" className="mx-auto mb-3 partnerImg" alt="Partner 2" />
                            </div>
                            <h5 className="card-title">North Toronto Auction</h5>
                            <p className="card-text">Logistics for fast and reliable shipping.</p>
                        </div>
                        <div className="col text-center">
                            <div className='homePartnerLogo'>
                                <img src="/images/partner/third.png" className="mx-auto mb-3 partnerImg" alt="Partner 3" />
                            </div>
                            <h5 className="card-title">Heritage Auction</h5>
                            <p className="card-text">Authentication for rare and collectible items.</p>
                        </div>
                        <div className="col text-center">
                            <div className='homePartnerLogo'>
                                <img src="/images/partner/fourth.png" className="mx-auto mb-3 partnerImg" alt="Partner 4" />
                            </div>
                            <h5 className="card-title">Miller and Miller Auction</h5>
                            <p className="card-text">Marketing support to boost your auction visibility.</p>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
};

export default Home;