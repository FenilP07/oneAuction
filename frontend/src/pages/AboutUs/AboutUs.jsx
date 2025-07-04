import React from 'react';
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Navbar from '../../components/Navbar.jsx';

const AboutUs = () => {
	return (
		<>
			<Navbar />
			<section className="container-fluid bgSecond">
				<h2 className='textSecond fw-bold text-center py-4'>About Us</h2>
				<div className="row px-5">
					{/* Website Information */}
					<div className="col-12 col-md-6">
						<div className='border border-3 border-secondary rounded-4 p-4'>
							<div className="text-center mb-3">
								<img src="/images/AuctionLogo.png" className="img-fluid" alt="OneAuction" />
							</div>
							<blockquote class="blockquote">
								<p className="">
									<strong className='textSecond'>OneAuction</strong> is your premier online auction platform, offering a dynamic marketplace for buyers and sellers to connect, bid, and trade unique items with ease.
								</p>
							</blockquote>
						</div>
					</div>

					{/* Company Information */}
					<div className="col-12 col-md-6">
						<div className='border border-3 border-secondary rounded-4 p-4'>
							<div className="text-center mb-3">
								<img src="/images/MaxFyreLogo.png" className="img-fluid mb-3" style={{ height: '50px' }} alt="MaxFyare Technologies" />
							</div>
							<blockquote class="blockquote">
								<p className="">
									<strong className='textSecond'>MaxFyare Technologies</strong> is the innovative force behind OneAuction, dedicated to revolutionizing the online auction experience with cutting-edge technology and secure platforms.
								</p>
							</blockquote>
						</div>
					</div>
				</div>

				<div className="row bgOne mt-5">
					{/* Purpose */}
					<div className="col-12 p-5">
						<h2 className="text-center textOne mb-4">Our Purpose</h2>
						<blockquote class="blockquote px-5">
							<p className="textOne text-center">
								Our purpose is to create a transparent, secure, and accessible auction environment that empowers users to discover rare treasures and sellers to maximize value, fostering a global community of trust and opportunity.
							</p>
						</blockquote>
					</div>
				</div>

				<div className="row bgSecond p-5">
					{/* Usefulness */}
					<div className="col-12">
						<h2 className="text-center textSecond mb-5">How It Is Useful</h2>
						<div className="row g-4">
							<div className="col-12 col-md-4 text-center">
								<h5 className='textSecond fw-semibold'>For Buyers</h5>
								<blockquote class="blockquote px-5">
									<p>Access a wide variety of unique items, bid competitively, and win at great prices with real-time updates.</p>
								</blockquote>						
							</div>
							<div className="col-12 col-md-4 fw-3 text-center">
								<h5 className='textSecond fw-semibold'>For Sellers</h5>
								<blockquote class="blockquote px-5">
									<p>List items easily, reach a global audience, and earn valuable prices through flexible auction scheduling.</p>
								</blockquote>			
							</div>
							<div className="col-12 col-md-4 fw-3 text-center">
								<h5 className='textSecond fw-semibold'>For All</h5>
								<blockquote class="blockquote px-5">
									<p>Enjoy a user-friendly interface, secure transactions, and a trusted platform supported by MaxFyare Technologies.</p>
								</blockquote>
							</div>
						</div>
					</div>
				</div>
			</section>
		</>
	);
};

export default AboutUs;