import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { FerrisWheel, Loader } from "lucide-react";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message || "Failed to sign in");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={cn("w-full backdrop-blur-sm", className)} {...props}>
      <CardContent className="p-6">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="flex flex-col items-center gap-3 font-medium">
              <div className="relative text-muted-foreground">
                <FerrisWheel className="h-12 w-12" />
              </div>
              <h1 className="text-2xl font-bold">MARS</h1>
              <p className="text-sm text-muted-foreground text-center">
                Material Analysis & Review System
              </p>
            </div>
            <h2 className="text-lg font-semibold mt-2">Welcome</h2>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="grid gap-3">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-3">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className={`w-full transition-all duration-300 ${
                loading
                  ? "bg-gradient-to-r from-[#eb59ff] to-[#032a83] border-0 text-white animate-brand-wave"
                  : ""
              }`}
              disabled={loading}
            >
              <span className="relative z-20 flex items-center justify-center">
                {loading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Signing in..." : "Login"}
              </span>
            </Button>
          </form>
          <div className="text-center max-w-md">
            <p className="text-gray-500 dark:text-gray-400 text-xs">
              Built by{" "}
              <a
                href="https://www.teampps.com.au"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-[#eb59ff] to-[#032a83] bg-clip-text text-transparent hover:from-[#f472b6] hover:to-[#1e40af] transition-all duration-300"
              >
                TEAM
              </a>{" "}
              • © 2025
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
