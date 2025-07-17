import React from "react";
import { Badge } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock } from "@fortawesome/free-solid-svg-icons";

const AuctionTimer = React.memo(({ timer, isEnded }) => {
  return (
    <div className="text-center">
      <Badge 
        bg={isEnded ? "danger" : "dark"} 
        className="fs-5 py-2 px-3 d-inline-flex align-items-center gap-2"
      >
        <FontAwesomeIcon icon={faClock} /> {timer}
      </Badge>
    </div>
  );
});

AuctionTimer.displayName = "AuctionTimer";
export default AuctionTimer;