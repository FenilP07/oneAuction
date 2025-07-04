import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom'; // Import NavLink
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { logoutUser } from '../services/userService.js';
import useAuthStore from '../store/authStore.js';

function Navbar() {
	const { user, clearAuth } = useAuthStore();
	const navigate = useNavigate();

	const handleLogout = async () => {
		try {
			await logoutUser();
			clearAuth();
			navigate('/login');
		} catch (error) {
			console.error('Logout failed:', error.message);
			clearAuth();
			navigate('/login');
		}
	};

	return (
		<nav className="navbar navbar-expand-lg bgOne navbar-dark" aria-label="Main navigation">
			<div className="container-fluid">
				<Link className="navbar-brand" to="/home" aria-label="OneAuction Home">
					<img src="/images/AuctionLogo.png" alt="OneAuction Logo" height="32" />
				</Link>

				<button
					className="navbar-toggler"
					type="button"
					data-bs-toggle="collapse"
					data-bs-target="#navbarNav"
					aria-controls="navbarNav"
					aria-expanded="false"
					aria-label="Toggle navigation"
				>
					<span className="navbar-toggler-icon"></span>
				</button>

				<div className="collapse navbar-collapse" id="navbarNav">
					{/* Left Nav Items */}
					<ul className="navbar-nav me-auto">
						<li className="nav-item">
							<NavLink className="nav-link fw-bold" to="/home" activeClassName="active">
								Home
							</NavLink>
						</li>
						<li className="nav-item">
							<NavLink className="nav-link fw-bold" to="/aboutUs" activeClassName="active">
								About Us
							</NavLink>
						</li>
						<li className="nav-item">
							<NavLink className="nav-link fw-bold" to="/browseAuctions" activeClassName="active">
								Auctions
							</NavLink>
						</li>
						{user && (
							<>
								<li className="nav-item">
									<NavLink className="nav-link fw-bold" to="/dashboard" activeClassName="active">
										Dashboard
									</NavLink>
								</li>
							</>
						)}
					</ul>

					{/* Right Side Login / Profile */}
					<ul className="navbar-nav ms-auto">
						{!user ? (
							<li className="nav-item">
								<NavLink className="nav-link fw-bold" to="/login" activeClassName="active">
									Login
								</NavLink>
							</li>
						) : (
							<li className="nav-item dropdown">
								<a
									className="nav-link dropdown-toggle d-flex align-items-center"
									href="#"
									id="navbarDropdown"
									role="button"
									data-bs-toggle="dropdown"
									aria-expanded="false"
									aria-label={`User menu for ${user.profile?.firstName || 'User'}`}
								>
									{user.profile?.avatarUrl ? (
										<img
											src={user.profile.avatarUrl}
											alt={`${user.profile.firstName}'s avatar`}
											className="rounded-circle me-2"
											width="30"
											height="30"
										/>
									) : (
										<i className="bi bi-person-circle me-2" style={{ fontSize: '1.5rem' }}></i>
									)}
									{user.profile?.firstName} {user.profile?.lastName}
								</a>
								<ul className="dropdown-menu dropdown-menu-end" aria-labelledby="navbarDropdown">
									<li>
										<Link className="dropdown-item" to="/profile">
											Profile
										</Link>
									</li>
									<li>
										<hr className="dropdown-divider" />
									</li>
									<li>
										<button className="dropdown-item" onClick={handleLogout} aria-label="Log out">
											Logout
										</button>
									</li>
								</ul>
							</li>
						)}
					</ul>
				</div>
			</div>
		</nav>
	);
}

export default Navbar;
