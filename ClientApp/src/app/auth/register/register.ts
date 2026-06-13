import { Component } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.html',
  styleUrls: ['../auth-layout.css'],
  
  imports: [CommonModule, FormsModule, RouterModule],
 
})

export class Register {

  userName = '';
  email = '';
  password = '';

  errorMessage = '';

  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
     private cdr: ChangeDetectorRef
  ) {}

 
register() {

  if (!this.userName || !this.email || !this.password) {
    this.errorMessage = 'All fields are required';
    return;
  }

  this.errorMessage = '';
  this.isLoading = true;

  this.authService.register(this.userName, this.email, this.password)
    .subscribe({
      next: () => {

        this.isLoading = false;

        this.authService.setPendingRegister({
          userName: this.userName,
          email: this.email,
          password: this.password
        });

        this.router.navigate(['/verify-otp']);
      },

      error: (err) => {

  this.isLoading = false;

  if (typeof err.error === 'string') {
    this.errorMessage = err.error;
  }
  else if (err.error?.message) {
    this.errorMessage = err.error.message;
  }
  else {
    this.errorMessage = 'Registration failed. Please try again.';
  }

  this.cdr.detectChanges();
}
    });
}

}
