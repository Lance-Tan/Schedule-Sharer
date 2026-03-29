import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private baseUrl = `${environment.apiUrl}/courses`;

  constructor(private http: HttpClient) { }

  getClassmates(courseId: number) {
    return this.http.get(`${this.baseUrl}/${courseId}/classmates`);
  }
}
