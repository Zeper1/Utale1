import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import BookLibrary from "@/components/BookLibrary";
import { 
  BookOpen, 
  User, 
  Package, 
  Plus, 
  MessageSquare, 
  Pencil, 
  MoreHorizontal, 
  ChevronRight, 
  Check,
  Eye,
  Loader2,
  Upload,
  Camera
} from "lucide-react";

// Form schema for child profile creation
const profileSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  age: z.string()
    .transform(val => parseInt(val, 10))
    .refine(val => !isNaN(val) && val > 0 && val <= 18, "La edad debe estar entre 1 y 18 años"),
  gender: z.string().optional(),
  physicalDescription: z.string().optional(),
  personality: z.string().optional(),
  likes: z.string().optional(),
  dislikes: z.string().optional(),
  additionalInfo: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function Dashboard() {
  const [_, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isNewProfileOpen, setIsNewProfileOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      setLocation("/");
      toast({
        title: "Authentication required",
        description: "Please log in to access your dashboard",
        variant: "destructive",
      });
    }
  }, [user, setLocation, toast]);

  // Fetch child profiles
  const { 
    data: childProfiles = [],
    isLoading: profilesLoading,
    error: profilesError
  } = useQuery({
    queryKey: ['/api/users', user?.id, 'profiles'],
    queryFn: () => apiRequest('GET', `/api/users/${user?.id}/profiles`).then(res => res.json()),
    enabled: !!user?.id,
  });

  // Fetch books
  const {
    data: books = [],
    isLoading: booksLoading,
    error: booksError
  } = useQuery({
    queryKey: ['/api/users', user?.id, 'books'],
    queryFn: () => apiRequest('GET', `/api/users/${user?.id}/books`).then(res => res.json()),
    enabled: !!user?.id,
  });

  // Fetch orders
  const {
    data: orders = [],
    isLoading: ordersLoading,
    error: ordersError
  } = useQuery({
    queryKey: ['/api/users', user?.id, 'orders'],
    queryFn: () => apiRequest('GET', `/api/users/${user?.id}/orders`).then(res => res.json()),
    enabled: !!user?.id,
  });

  // Create child profile mutation
  const createProfile = useMutation({
    mutationFn: (profile: any) => 
      apiRequest('POST', '/api/profiles', { ...profile, userId: user?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', user?.id, 'profiles'] });
      setIsNewProfileOpen(false);
      toast({
        title: "Profile created",
        description: "Child profile has been successfully created.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error creating profile",
        description: "There was an error creating the profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Upload avatar for a profile
  const uploadAvatar = async (profileId: number) => {
    if (!avatarFile) return null;
    
    setUploadingAvatar(true);
    
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      
      const response = await fetch(`/api/profiles/${profileId}/avatar`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload avatar');
      }
      
      const data = await response.json();
      setUploadingAvatar(false);
      return data.avatarUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error al subir imagen",
        description: "No se pudo subir la imagen de perfil. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
      setUploadingAvatar(false);
      return null;
    }
  };

  // Configure profile form
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      age: "",
      gender: "",
      physicalDescription: "",
      personality: "",
      likes: "",
      dislikes: "",
      additionalInfo: ""
    },
  });

  // Handle form submission
  const onSubmit = async (values: ProfileFormValues) => {
    try {
      // First create the profile
      const profileResponse = await apiRequest('POST', '/api/profiles', { 
        name: values.name,
        age: parseInt(values.age.toString(), 10),
        gender: values.gender,
        userId: user?.id,
        interests: [],
        favorites: {},
        friends: [],
        traits: [],
        physicalDescription: values.physicalDescription || null,
        personality: values.personality || null,
        likes: values.likes || null,
        dislikes: values.dislikes || null,
        additionalInfo: values.additionalInfo || null,
      });
      
      if (!profileResponse.ok) {
        throw new Error('Failed to create profile');
      }
      
      const profile = await profileResponse.json();
      
      // If we have an avatar file, upload it
      if (avatarFile) {
        await uploadAvatar(profile.id);
      }
      
      // Refresh the profiles list
      queryClient.invalidateQueries({ queryKey: ['/api/users', user?.id, 'profiles'] });
      
      // Close the dialog and reset form
      setIsNewProfileOpen(false);
      setAvatarFile(null);
      setAvatarPreview(null);
      form.reset();
      
      toast({
        title: "Perfil creado",
        description: "El perfil del niño ha sido creado exitosamente.",
      });
    } catch (error) {
      toast({
        title: "Error al crear perfil",
        description: "Hubo un error al crear el perfil. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  // Navigate to profile chat
  const goToProfileChat = (profileId: number) => {
    setLocation(`/profile-chat/${profileId}`);
  };

  // Navigate to create book
  const goToCreateBook = () => {
    if (childProfiles.length === 0) {
      toast({
        title: "No profiles yet",
        description: "Please create a child profile first before creating a book.",
      });
      setIsNewProfileOpen(true);
      return;
    }
    setLocation('/create-book');
  };

  if (!user) {
    return null; // Will redirect due to useEffect
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Mi panel</h1>
          <p className="text-gray-600">Gestiona perfiles, libros y pedidos en un solo lugar</p>
        </div>
        <div className="flex gap-4">
          <Button onClick={goToCreateBook} className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Crear nuevo libro
          </Button>
          <Button onClick={() => setIsNewProfileOpen(true)} variant="outline" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Añadir perfil infantil
          </Button>
        </div>
      </div>

      <Tabs defaultValue="profiles" className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="profiles" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Child Profiles
          </TabsTrigger>
          <TabsTrigger value="books" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            My Books
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Orders
          </TabsTrigger>
        </TabsList>

        {/* Profiles Tab */}
        <TabsContent value="profiles" className="space-y-6">
          {profilesLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : profilesError ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-red-500">Error loading profiles. Please try again later.</p>
              </CardContent>
            </Card>
          ) : childProfiles.length === 0 ? (
            <Card>
              <CardContent className="pt-6 flex flex-col items-center text-center py-12">
                <div className="bg-primary-50 p-4 rounded-full mb-4">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No Child Profiles Yet</h3>
                <p className="text-gray-600 mb-6 max-w-md">
                  Start by creating a profile for your child. This information will be used to personalize their stories.
                </p>
                <Button onClick={() => setIsNewProfileOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Create First Profile
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {childProfiles.map((profile: any) => (
                <Card key={profile.id} className="overflow-hidden">
                  <CardHeader className="bg-primary-50 pb-4">
                    <div className="flex items-start gap-4">
                      <div className="h-16 w-16 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                        {profile.avatarUrl ? (
                          <img 
                            src={profile.avatarUrl} 
                            alt={`Avatar de ${profile.name}`} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <CardTitle>{profile.name}</CardTitle>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <CardDescription>
                          {profile.age} años • {profile.gender === 'boy' ? 'Niño' : 
                                        profile.gender === 'girl' ? 'Niña' : 
                                        profile.gender === 'non-binary' ? 'No binario' : 
                                        "No especificado"}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {profile.physicalDescription && (
                        <div>
                          <h4 className="text-sm font-semibold mb-1">Descripción física</h4>
                          <p className="text-sm text-gray-600">{profile.physicalDescription}</p>
                        </div>
                      )}
                      
                      {profile.personality && (
                        <div>
                          <h4 className="text-sm font-semibold mb-1">Personalidad</h4>
                          <p className="text-sm text-gray-600">{profile.personality}</p>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4">
                        {profile.likes && (
                          <div>
                            <h4 className="text-sm font-semibold mb-1">Le gusta</h4>
                            <p className="text-sm text-gray-600">{profile.likes}</p>
                          </div>
                        )}
                        
                        {profile.dislikes && (
                          <div>
                            <h4 className="text-sm font-semibold mb-1">No le gusta</h4>
                            <p className="text-sm text-gray-600">{profile.dislikes}</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Mantener los campos originales si están presentes */}
                      {profile.interests && profile.interests.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-1">Intereses</h4>
                          <div className="flex flex-wrap gap-1">
                            {profile.interests.map((interest: string, idx: number) => (
                              <span key={idx} className="bg-gray-100 px-2 py-1 rounded-full text-xs">
                                {interest}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {profile.friends && profile.friends.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-1">Amigos</h4>
                          <p className="text-sm text-gray-600">
                            {profile.friends.slice(0, 3).join(", ")}
                            {profile.friends.length > 3 && ` y ${profile.friends.length - 3} más`}
                          </p>
                        </div>
                      )}
                      
                      {profile.traits && profile.traits.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-1">Rasgos</h4>
                          <div className="flex flex-wrap gap-1">
                            {profile.traits.slice(0, 3).map((trait: string, idx: number) => (
                              <span key={idx} className="bg-gray-100 px-2 py-1 rounded-full text-xs">
                                {trait}
                              </span>
                            ))}
                            {profile.traits.length > 3 && (
                              <span className="text-xs text-gray-500">+{profile.traits.length - 3} más</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2 border-t pt-4">
                    <Button onClick={() => goToProfileChat(profile.id)} variant="outline" className="flex-1 gap-1">
                      <MessageSquare className="h-4 w-4" /> Chat
                    </Button>
                    <Button onClick={goToCreateBook} className="flex-1 gap-1">
                      <BookOpen className="h-4 w-4" /> Crear libro
                    </Button>
                  </CardFooter>
                </Card>
              ))}
              <Card className="border-dashed border-2 flex flex-col justify-center items-center p-6 h-full">
                <div className="bg-gray-100 p-4 rounded-full mb-4">
                  <Plus className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">Añadir otro perfil</h3>
                <p className="text-gray-500 text-sm mb-4 text-center">
                  Crea perfiles para más niños y personaliza libros para ellos
                </p>
                <Button onClick={() => setIsNewProfileOpen(true)} variant="outline">
                  Añadir perfil
                </Button>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Books Tab */}
        <TabsContent value="books" className="space-y-6">
          {booksLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : booksError ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-red-500">Error loading books. Please try again later.</p>
              </CardContent>
            </Card>
          ) : books.length === 0 ? (
            <Card>
              <CardContent className="pt-6 flex flex-col items-center text-center py-12">
                <div className="bg-primary-50 p-4 rounded-full mb-4">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No Books Created Yet</h3>
                <p className="text-gray-600 mb-6 max-w-md">
                  Create your first personalized book for a child. Select a profile and theme to get started.
                </p>
                <Button onClick={goToCreateBook}>
                  <Plus className="h-4 w-4 mr-2" /> Create First Book
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Your Book Library</h2>
                <Button onClick={goToCreateBook} variant="outline" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Create New Book
                </Button>
              </div>
              
              {user && user.id && (
                <BookLibrary userId={user.id} />
              )}
            </>
          )}
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          {ordersLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : ordersError ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-red-500">Error loading orders. Please try again later.</p>
              </CardContent>
            </Card>
          ) : orders.length === 0 ? (
            <Card>
              <CardContent className="pt-6 flex flex-col items-center text-center py-12">
                <div className="bg-primary-50 p-4 rounded-full mb-4">
                  <Package className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No Orders Yet</h3>
                <p className="text-gray-600 mb-6 max-w-md">
                  After creating your personalized book, you can place an order for a printed copy or digital download.
                </p>
                <Button onClick={goToCreateBook}>
                  <Plus className="h-4 w-4 mr-2" /> Create a Book First
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order: any) => {
                const book = books.find((b: any) => b.id === order.bookId);
                return (
                  <Card key={order.id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex gap-4">
                          <div className="h-20 w-16 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                            {book?.previewImage ? (
                              <img 
                                src={book.previewImage} 
                                alt={book?.title || "Book cover"} 
                                className="h-full w-full object-cover rounded"
                              />
                            ) : (
                              <BookOpen className="h-8 w-8 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold">{book?.title || "Personalized Book"}</h3>
                            <p className="text-sm text-gray-600">
                              {book?.format || "Unknown format"} • Order #{order.id}
                            </p>
                            <p className="text-sm text-gray-500">
                              Ordered on {new Date(order.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">${(order.amount / 100).toFixed(2)}</span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              order.status === 'completed' ? 'bg-green-100 text-green-800' :
                              order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Button variant="outline" size="sm">
                              Track Order
                            </Button>
                            <Button variant="ghost" size="sm">
                              Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Profile Dialog */}
      <Dialog open={isNewProfileOpen} onOpenChange={(open) => {
        if (!open) {
          form.reset();
          setAvatarFile(null);
          setAvatarPreview(null);
        }
        setIsNewProfileOpen(open);
      }}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Crear perfil infantil</DialogTitle>
            <DialogDescription>
              Añade detalles sobre el niño para personalizar sus historias. Podrás actualizar esta información más adelante.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Avatar upload */}
              <div className="flex flex-col items-center space-y-4 mb-6">
                <div 
                  className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors"
                  onClick={handleUploadClick}
                >
                  {avatarPreview ? (
                    <img 
                      src={avatarPreview} 
                      alt="Avatar preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={handleUploadClick}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Subir foto
                </Button>
                <p className="text-xs text-gray-500 text-center">
                  Opcional: Sube una foto del niño para personalizar su avatar en los libros
                </p>
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del niño" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Edad</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          max="18" 
                          placeholder="Edad" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Género (Opcional)</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona género" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="boy">Niño</SelectItem>
                          <SelectItem value="girl">Niña</SelectItem>
                          <SelectItem value="non-binary">No binario</SelectItem>
                          <SelectItem value="prefer-not-to-say">Prefiero no decirlo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Additional description fields */}
              <FormField
                control={form.control}
                name="physicalDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción física (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe el aspecto físico del niño: color de pelo, ojos, altura, etc." 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="personality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Personalidad (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe la personalidad del niño: tímido, aventurero, curioso, etc." 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="likes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Le gusta (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="¿Qué le gusta al niño? Juguetes, actividades, comidas favoritas..." 
                          className="resize-none h-24" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="dislikes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>No le gusta (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="¿Qué no le gusta al niño? Comidas, situaciones, miedos..." 
                          className="resize-none h-24" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="additionalInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Información adicional (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Cualquier otra información relevante que quieras compartir para personalizar mejor los libros" 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => {
                  setIsNewProfileOpen(false);
                  form.reset();
                  setAvatarFile(null);
                  setAvatarPreview(null);
                }}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createProfile.isPending || uploadingAvatar}
                >
                  {createProfile.isPending || uploadingAvatar ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : 'Crear perfil'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}