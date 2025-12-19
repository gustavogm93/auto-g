import { IssueList } from '@/components/IssueList'
import { Header } from '@/components/Header'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <IssueList />
      </div>
    </main>
  )
}
