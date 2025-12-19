import { Header } from "@/components/Header";
import { IssueList } from "@/components/IssueList";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <IssueList />
      </div>
    </main>
  );
}
