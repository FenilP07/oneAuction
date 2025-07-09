import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar.jsx";
import {
  Card,
  Col,
  Row,
  Tab,
  Tabs,
  Table,
  Badge,
  Button,
  ProgressBar,
  Spinner,
} from "react-bootstrap";
import {
  FiPackage,
  FiDollarSign,
  FiAward,
  FiShoppingBag,
  FiTrendingUp,
  FiClock,
  FiUser,
  FiSettings,
  FiList,
  FiBarChart2,
} from "react-icons/fi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import useAuthStore from "../../store/authStore";
import { getMyAuctions, getMyBids } from "../../services/auctionService";
import { getMyItems } from "../../services/itemService";
import { createAuction } from "../../services/auctionService.js";
import { createItem } from "../../services/itemService";
import AuctionModal from "../../components/AuctionModal.jsx";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("auctioneer");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    itemsListed: 0,
    auctionsCreated: 0,
    activeAuctions: 0,
    pendingApprovals: 0,
    bidsPlaced: 0,
    itemsWon: 0,
    watchlist: 0,
  });

  const [myItems, setMyItems] = useState([]);
  const [myAuctions, setMyAuctions] = useState([]);
  const [biddingActivity, setBiddingActivity] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, activeTab]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      if (activeTab === "auctioneer") {
        // Fetch auctioneer-specific data
        const [itemsRes, auctionsRes] = await Promise.all([
          getMyItems(),
          getMyAuctions(),
        ]);

        setMyItems(itemsRes.items || []);
        setMyAuctions(auctionsRes.auctions || []);

        // Calculate stats
        const pendingItems = itemsRes.items.filter(
          (item) => item.status === "pending_approval"
        ).length;

        const activeAuctions = auctionsRes.auctions.filter(
          (auction) => auction.auction_status === "active"
        ).length;

        setStats((prev) => ({
          ...prev,
          itemsListed: itemsRes.data.items.length,
          auctionsCreated: auctionsRes.data.auctions.length,
          activeAuctions,
          pendingApprovals: pendingItems,
        }));

        // Generate performance data (mock for now)
        generatePerformanceData(itemsRes.data.items, auctionsRes.data.auctions);
      } else {
        // Fetch bidder-specific data
        const bidsRes = await getMyBids();
        setBiddingActivity(bidsRes.data.bids || []);

        setStats((prev) => ({
          ...prev,
          bidsPlaced: bidsRes.data.bids.length,
          itemsWon: bidsRes.data.bids.filter((bid) => bid.status === "won")
            .length,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generatePerformanceData = (items, auctions) => {
    // Group items by month and calculate revenue
    const monthlyData = items.reduce((acc, item) => {
      if (item.status === "available" || item.status === "sold") {
        const month = new Date(item.createdAt).getMonth();
        const monthName = new Date(0, month).toLocaleString("default", {
          month: "short",
        });

        if (!acc[monthName]) {
          acc[monthName] = { items: 0, revenue: 0 };
        }

        acc[monthName].items += 1;
        if (item.status === "sold") {
          acc[monthName].revenue += item.current_bid;
        }
      }
      return acc;
    }, {});

    // Convert to array format for recharts
    const performance = Object.entries(monthlyData).map(([name, data]) => ({
      name,
      items: data.items,
      revenue: data.revenue,
    }));

    setPerformanceData(performance);
  };

  const handleCreateAuction = async (auctionData) => {
    try {
      await createAuction(auctionData);
      fetchDashboardData();
    } catch (error) {
      console.error("Failed to create auction:", error);
    }
  };

  const handleCreateItem = async (itemData) => {
    try {
      await createItem(itemData);
      fetchDashboardData();
    } catch (error) {
      console.error("Failed to create item:", error);
    }
  };

  const handleAuctionCreate = (data) => {
		console.log('Auction created:',data);
	}

  const renderAuctioneerDashboard = () => (
    <>
      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={3} sm={6} className="mb-3">
          <Card>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-primary bg-opacity-10 p-3 rounded me-3">
                  <FiPackage size={24} className="text-primary" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Items Listed</h6>
                  <h4 className="mb-0">{stats.itemsListed}</h4>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <Card>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-success bg-opacity-10 p-3 rounded me-3">
                  <FiShoppingBag size={24} className="text-success" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Auctions Created</h6>
                  <h4 className="mb-0">{stats.auctionsCreated}</h4>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <Card>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-warning bg-opacity-10 p-3 rounded me-3">
                  <FiClock size={24} className="text-warning" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Active Auctions</h6>
                  <h4 className="mb-0">{stats.activeAuctions}</h4>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <Card>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-info bg-opacity-10 p-3 rounded me-3">
                  <FiDollarSign size={24} className="text-info" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Pending Approvals</h6>
                  <h4 className="mb-0">{stats.pendingApprovals}</h4>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Charts and Tables */}
      <Row>
        <Col lg={8} className="mb-4">
          <Card className="h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <Card.Title>Sales Performance</Card.Title>
                <Button variant="outline-primary" size="sm">
                  View Report
                </Button>
              </div>
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" />
                </div>
              ) : (
                <div style={{ height: "300px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="revenue"
                        fill="#4e73df"
                        name="Revenue ($)"
                      />
                      <Bar dataKey="items" fill="#1cc88a" name="Items Sold" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4} className="mb-4">
          <Card className="h-100">
            <Card.Body>
              <Card.Title className="mb-3">Recent Items</Card.Title>
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" />
                </div>
              ) : (
                <>
                  <Table hover responsive>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Status</th>
                        <th>Bids</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myItems.slice(0, 5).map((item) => (
                        <tr
                          key={item._id}
                          onClick={() => navigate(`/items/${item._id}`)}
                          style={{ cursor: "pointer" }}
                        >
                          <td>{item.name}</td>
                          <td>
                            <Badge bg={getStatusBadgeColor(item.status)}>
                              {item.status}
                            </Badge>
                          </td>
                          <td>{item.bids || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  <Button
                    variant="outline-primary"
                    className="w-100 mt-2"
                    onClick={() => navigate("/items")}
                  >
                    View All Items
                  </Button>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Auction Management */}
      <Card className="mb-4">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Card.Title>Auction Management</Card.Title>
            {/* <Button
              variant="primary"
              // onClick={() => navigate("/auctions/create")}
            >
              Create New Auction
            </Button> */}
            <AuctionModal onAuctionCreate={handleAuctionCreate} />
          </div>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : (
            <Table hover responsive>
              <thead>
                <tr>
                  <th>Auction</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th>End Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {myAuctions.slice(0, 5).map((auction) => (
                  <tr key={auction._id}>
                    <td>{auction.auction_title}</td>
                    <td>
                      <Badge bg={getAuctionStatusBadge(auction.auction_status)}>
                        {auction.auction_status}
                      </Badge>
                    </td>
                    <td>{auction.settings?.item_ids?.length || 1}</td>
                    <td>
                      {new Date(auction.auction_end_time).toLocaleDateString()}
                    </td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        onClick={() => navigate(`/auctions/${auction._id}`)}
                      >
                        View
                      </Button>
                      {auction.auction_status === "upcoming" && (
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={() =>
                            navigate(`/auctions/${auction._id}/edit`)
                          }
                        >
                          Edit
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </>
  );

  const renderBidderDashboard = () => (
    <>
      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={3} sm={6} className="mb-3">
          <Card>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-primary bg-opacity-10 p-3 rounded me-3">
                  <FiShoppingBag size={24} className="text-primary" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Bids Placed</h6>
                  <h4 className="mb-0">{stats.bidsPlaced}</h4>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <Card>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-success bg-opacity-10 p-3 rounded me-3">
                  <FiAward size={24} className="text-success" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Items Won</h6>
                  <h4 className="mb-0">{stats.itemsWon}</h4>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <Card>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-warning bg-opacity-10 p-3 rounded me-3">
                  <FiClock size={24} className="text-warning" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Watchlist</h6>
                  <h4 className="mb-0">{stats.watchlist}</h4>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <Card>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-info bg-opacity-10 p-3 rounded me-3">
                  <FiDollarSign size={24} className="text-info" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Total Spent</h6>
                  <h4 className="mb-0">${stats.totalSpent || 0}</h4>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Bidding Activity */}
      <Card className="mb-4">
        <Card.Body>
          <Card.Title className="mb-3">Your Bidding Activity</Card.Title>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : (
            <Table hover responsive>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Your Bid</th>
                  <th>Status</th>
                  <th>Time Left</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {biddingActivity.slice(0, 5).map((bid) => (
                  <tr key={bid._id}>
                    <td>{bid.item?.name || "N/A"}</td>
                    <td>${bid.amount}</td>
                    <td>
                      <Badge bg={getBidStatusBadge(bid.status)}>
                        {bid.status}
                      </Badge>
                    </td>
                    <td>{bid.timeLeft || "N/A"}</td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        onClick={() => navigate(`/items/${bid.item?._id}`)}
                      >
                        View
                      </Button>
                      {bid.status === "outbid" && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() =>
                            navigate(`/items/${bid.item?._id}/bid`)
                          }
                        >
                          Rebid
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Watchlist and Recommendations */}
      <Row>
        <Col md={6} className="mb-4">
          <Card className="h-100">
            <Card.Body>
              <Card.Title className="mb-3">Your Watchlist</Card.Title>
              {/* Watchlist content would go here */}
              <div className="text-center py-5">
                <p>Your watched items will appear here</p>
                <Button
                  variant="outline-primary"
                  onClick={() => navigate("/watchlist")}
                >
                  View Watchlist
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} className="mb-4">
          <Card className="h-100">
            <Card.Body>
              <Card.Title className="mb-3">Recommended For You</Card.Title>
              {/* Recommendations content would go here */}
              <div className="text-center py-5">
                <p>Recommended items will appear here</p>
                <Button
                  variant="outline-primary"
                  onClick={() => navigate("/auctions")}
                >
                  Browse Auctions
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "available":
        return "success";
      case "pending_approval":
        return "warning";
      case "sold":
        return "primary";
      case "rejected":
        return "danger";
      default:
        return "secondary";
    }
  };

  const getAuctionStatusBadge = (status) => {
    switch (status) {
      case "active":
        return "success";
      case "upcoming":
        return "warning";
      case "completed":
        return "primary";
      case "cancelled":
        return "danger";
      default:
        return "secondary";
    }
  };

  const getBidStatusBadge = (status) => {
    switch (status) {
      case "leading":
        return "success";
      case "outbid":
        return "danger";
      case "won":
        return "primary";
      case "lost":
        return "secondary";
      default:
        return "warning";
    }
  };

  if (!user) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-8 text-center p-4">
            <h3 className="mb-2">Authentication Required</h3>
            <p className="text-muted">Please log in to access your dashboard</p>
            <Button variant="primary" onClick={() => navigate("/login")}>
              Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="container-fluid py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="mb-1">Welcome back, {user.username || "User"}</h2>
            <p className="text-muted mb-0">
              {activeTab === "auctioneer"
                ? "Manage your auctions and items"
                : "Track your bids and discover new items"}
            </p>
          </div>
          <Button
            variant={activeTab === "auctioneer" ? "primary" : "outline-primary"}
            onClick={() =>
              navigate(
                activeTab === "auctioneer" ? "/itemListingPage" : "/auctions"
              )
            }
          >
            {activeTab === "auctioneer" ? "Add New Item" : "Browse Auctions"}
          </Button>
        </div>

        {/* Role Tabs */}
        <Tabs
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k)}
          className="mb-4"
        >
          <Tab
            eventKey="auctioneer"
            title={
              <span>
                <FiUser className="me-1" /> Auctioneer
              </span>
            }
          >
            {renderAuctioneerDashboard()}
          </Tab>
          <Tab
            eventKey="bidder"
            title={
              <span>
                <FiShoppingBag className="me-1" /> Bidder
              </span>
            }
          >
            {renderBidderDashboard()}
          </Tab>
        </Tabs>
      </main>
    </>
  );
};

export default Dashboard;
