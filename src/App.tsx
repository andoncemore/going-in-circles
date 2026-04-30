import { Suspense } from 'react'
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom'
import { widgets } from './widgets'
import Home from './pages/Home'

interface Props {
  initialPath?: string
}

function AppRoutes() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        {widgets.map((widget) => {
          const Component = widget.component
          return <Route key={widget.path} path={widget.path} element={<Component />} />
        })}
      </Routes>
    </Suspense>
  )
}

export default function App({ initialPath }: Props) {
  if (initialPath !== undefined) {
    return (
      <MemoryRouter initialEntries={[initialPath]}>
        <AppRoutes />
      </MemoryRouter>
    )
  }
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
