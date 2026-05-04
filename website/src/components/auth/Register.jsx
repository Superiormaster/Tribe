import { useState } from "react"
import API from "./api"

function Register() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    try {
      await API.post("/auth/register/", form);
      alert("Registration successful!");
    } catch {
      alert("Error during registration");
    }
  };

  return (
    <div>
      <h2>Create Account</h2>
      <input name="username" placeholder="Username" onChange={handleChange} />
      <input name="email" placeholder="Email" onChange={handleChange} />
      <input name="password" type="password" placeholder="Password" onChange={handleChange} />
      <button onClick={handleSubmit}>Register</button>
    </div>
  )
}

export default Register