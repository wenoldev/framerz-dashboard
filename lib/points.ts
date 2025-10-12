export const POINTS_PER_100_RS = 10 // 100 ₹ => 10 points
export const POINTS_PER_RS = POINTS_PER_100_RS / 100 // 0.1 point per ₹
export const LINK_COST_POINTS = 200 // one link consumes 200 points

export function rupeesToPoints(amountRs: number) {
  return Math.floor(amountRs * POINTS_PER_RS)
}

export function pointsToRupees(points: number) {
  return Math.ceil(points / POINTS_PER_RS)
}
