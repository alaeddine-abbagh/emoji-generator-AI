import { EmojiProvider } from "./contexts/emoji-context";
import EmojiGenerator from "./components/emoji-generator";
import EmojiGrid from "./components/emoji-grid";

export default function Home() {
  return (
    <EmojiProvider>
      <div className="min-h-screen bg-gradient-to-b from-purple-100 to-pink-100 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
          <div className="p-6">
            <h1 className="text-4xl font-bold text-center mb-8 text-purple-800">Emoji Maker</h1>
            <EmojiGenerator />
            <EmojiGrid />
          </div>
        </div>
      </div>
    </EmojiProvider>
  );
}
