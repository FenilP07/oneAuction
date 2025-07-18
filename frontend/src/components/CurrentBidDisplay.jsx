import React from "react";

const CurrentBidDisplay = React.memo(({ currentBid, startingBid }) => {
  return (
    <div className="text-center">
      <h4 className="text-success fw-bold my-3">
        Current Bid: ${currentBid.toLocaleString()}
      </h4>
      <p className="text-muted mb-0">
        Starting bid: ${startingBid.toLocaleString()}
      </p>
    </div>
  );
});

CurrentBidDisplay.displayName = "CurrentBidDisplay";
export default CurrentBidDisplay;