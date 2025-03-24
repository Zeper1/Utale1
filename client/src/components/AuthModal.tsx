import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

// Define form validation schemas
const loginSchema = z.object({
  email: z.string().email({ message: "Por favor, introduce una dirección de correo válida" }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
  rememberMe: z.boolean().optional(),
});

const signupSchema = z.object({
  firstName: z.string().min(1, { message: "El nombre es obligatorio" }),
  lastName: z.string().min(1, { message: "El apellido es obligatorio" }),
  email: z.string().email({ message: "Por favor, introduce una dirección de correo válida" }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "Debes aceptar los términos y condiciones" }),
  }),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  view: "login" | "signup";
  setView: (view: "login" | "signup") => void;
}

const AuthModal = ({ isOpen, onClose, view, setView }: AuthModalProps) => {
  const { toast } = useToast();
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Initialize forms
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      termsAccepted: false as any, // Esto permite iniciar con false aunque el esquema requiera true
    },
  });

  const handleLoginSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      await signIn(data.email, data.password);
      toast({
        title: "Inicio de sesión exitoso",
        description: "¡Bienvenido de nuevo a Utale!",
      });
      onClose();
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Error de inicio de sesión",
        description: "Por favor, verifica tus credenciales e inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    try {
      const displayName = `${data.firstName} ${data.lastName}`;
      await signUp(data.email, data.password, displayName);
      toast({
        title: "Cuenta creada",
        description: "¡Bienvenido a Utale!",
      });
      onClose();
    } catch (error) {
      console.error("Signup error:", error);
      toast({
        title: "Error de registro",
        description: "Hubo un error al crear tu cuenta. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      onClose();
    } catch (error) {
      console.error("Google sign-in error:", error);
      toast({
        title: "Error de inicio con Google",
        description: "Hubo un error al iniciar sesión con Google. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  const toggleView = () => {
    setView(view === "login" ? "signup" : "login");
    loginForm.reset();
    signupForm.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        {view === "login" ? (
          <>
            <DialogTitle className="text-2xl text-center">Welcome Back</DialogTitle>
            <DialogDescription className="text-center">
              Log in to your StoryMagic account
            </DialogDescription>
            
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="your@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex items-center justify-between">
                  <FormField
                    control={loginForm.control}
                    name="rememberMe"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox 
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm cursor-pointer">Remember me</FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  <Button variant="link" className="p-0 h-auto" onClick={() => toast({ title: "Coming soon", description: "Password reset feature will be available soon." })}>
                    Forgot password?
                  </Button>
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Logging in..." : "Log In"}
                </Button>
              </form>
            </Form>
            
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-gray-300 absolute w-full"></div>
              <span className="bg-background px-3 text-sm text-muted-foreground relative">or continue with</span>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <Button variant="outline" onClick={handleGoogleSignIn} type="button">
                <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                  <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
                </svg>
                Google
              </Button>
            </div>
            
            <div className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Button variant="link" className="p-0 h-auto" onClick={toggleView}>
                Sign up
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogTitle className="text-2xl text-center">Create an Account</DialogTitle>
            <DialogDescription className="text-center">
              Join StoryMagic to create personalized books
            </DialogDescription>
            
            <Form {...signupForm}>
              <form onSubmit={signupForm.handleSubmit(handleSignupSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={signupForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={signupForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={signupForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="your@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={signupForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="At least 6 characters" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={signupForm.control}
                  name="termsAccepted"
                  render={({ field }) => (
                    <FormItem className="flex items-start space-x-2">
                      <FormControl>
                        <Checkbox 
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm">
                          I agree to the <Button variant="link" className="p-0 h-auto">Terms of Service</Button> and <Button variant="link" className="p-0 h-auto">Privacy Policy</Button>
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </Form>
            
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-gray-300 absolute w-full"></div>
              <span className="bg-background px-3 text-sm text-muted-foreground relative">or sign up with</span>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <Button variant="outline" onClick={handleGoogleSignIn} type="button">
                <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                  <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
                </svg>
                Google
              </Button>
            </div>
            
            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Button variant="link" className="p-0 h-auto" onClick={toggleView}>
                Log in
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
