"use client";

import React, { useEffect, useState } from "react";

interface DiceProps {
  value: number;
  rolling: boolean;
  size?: number;
}

export const Dice = ({ value, rolling, size = 64 }: DiceProps) => {
  // Mapping dice face to its transform to show it at the center
  // Since our rotation is on the .dice container, we do the inverse
  // Front: 1, Back: 6, Right: 3, Left: 4, Top: 2, Bottom: 5
  // If 1 is front (0,0), then to show 1 we rotate to (0,0)
  // To show 6 (back), we rotate to (0,180)
  // To show 3 (right), we rotate to (0,-90)
  // To show 4 (left), we rotate to (0,90)
  // To show 2 (top), we rotate to (-90,0)
  // To show 5 (bottom), we rotate to (90,0)
  
  const getRotation = (val: number) => {
    switch (val) {
      case 1:
        return { x: 0, y: 0 }; // Front
      case 2:
        return { x: -90, y: 0 }; // Top
      case 3:
        return { x: 0, y: -90 }; // Right
      case 4:
        return { x: 0, y: 90 }; // Left
      case 5:
        return { x: 90, y: 0 }; // Bottom
      case 6:
        return { x: 180, y: 0 }; // Back
      default:
        return { x: 0, y: 0 };
    }
  };

  const rot = getRotation(value);
  const zTrans = size / 2;

  // Add dynamic styles for variable size
  const diceStyles = {
    width: `${size}px`,
    height: `${size}px`,
  };

  const faceStyle = (rotateX: number, rotateY: number) => ({
    transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(${zTrans}px)`,
  });

  return (
    <div
      className="perspective-1000"
      style={{
        ...diceStyles,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <div
        className={`dice preserve-3d ${rolling ? "rolling" : ""}`}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          transition: rolling ? "none" : "transform 0.7s ease-out",
          transform: !rolling ? `rotateX(${rot.x}deg) rotateY(${rot.y}deg)` : undefined
        }}
      >
        <div className="dice-face face-1" style={faceStyle(0, 0)}>
          <div className="dot"></div>
        </div>
        <div className="dice-face face-2" style={faceStyle(90, 0)}>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
        <div className="dice-face face-3" style={faceStyle(0, 90)}>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
        <div className="dice-face face-4" style={faceStyle(0, -90)}>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
        <div className="dice-face face-5" style={faceStyle(-90, 0)}>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
        <div className="dice-face face-6" style={faceStyle(180, 0)}>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
      </div>
    </div>
  );
};
