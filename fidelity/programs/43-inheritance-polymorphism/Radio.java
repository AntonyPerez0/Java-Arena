public class Radio implements NoiseCapable {
    private final double frequency;

    public Radio(double frequency) {
        this.frequency = frequency;
    }

    @Override
    public String makeNoise() {
        return "Radio at " + this.frequency + " MHz plays music";
    }
}
