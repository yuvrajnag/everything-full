import { Navbar } from "@/components/layout/Navbar";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter flex flex-col">
      <Navbar />
      <main className="w-full max-w-4xl mx-auto px-6 py-24 flex-1">
        <h1 className="text-4xl font-black uppercase tracking-widest mb-10">Contact</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-12">
          <div className="flex flex-col gap-6">
            <h2 className="text-2xl font-bold text-white">Project Inquiry</h2>
            <p className="text-gray-400">
              This application is built for testing and demo purposes for Silver Cloud Labs by Beyond Studios. They will test this website for something.
            </p>
            
            <div className="bg-[#111] border border-[#333] p-6 mt-4">
              <p className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-2">Primary Contact</p>
              <p className="text-lg text-white">For architectural questions or professional inquiries regarding this codebase, please contact the repository owner or reviewing agency.</p>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <h2 className="text-2xl font-bold text-white">Fictional Locations</h2>
            <div className="space-y-4">
              <div className="border-l-2 border-[#333] pl-4">
                <p className="text-sm font-bold text-white">Example Headquarters (Fictional)</p>
                <p className="text-sm text-gray-500">100 Tech Innovation Way<br/>San Francisco, CA 94105</p>
              </div>
              <div className="border-l-2 border-[#333] pl-4">
                <p className="text-sm font-bold text-white">Example EU Office (Fictional)</p>
                <p className="text-sm text-gray-500">Silicon Roundabout<br/>London, UK EC1V</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      </div>
  );
}
