import React from "react"

const Box = props => {
  return (
    <div className={props.style}>
      <p>{props.num} </p>
      <p>{props.icon}</p>
      <p>{props.name}</p>
    </div>
  )
}

export default Box