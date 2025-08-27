import { UserNav } from "./user-nav"
import { Outlet } from "react-router-dom"

export function Layout() {
  return (
    <div>
      <UserNav />
      <main className="container mx-auto p-4">
        <Outlet />
      </main>
    </div>
  )
}