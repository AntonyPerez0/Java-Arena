public record Point(int x, int y) {
    public Point {
        if (x < 0) {
            this.x = 0;
        }
    }

    public void moveRight() {
        x = x + 1;
    }
}
